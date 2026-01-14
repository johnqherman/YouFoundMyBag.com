import express, { Request, Response, NextFunction } from 'express';
import { logger } from '../../infrastructure/logger/index.js';
import {
  createBagSchema,
  shortIdSchema,
} from '../../infrastructure/utils/validation.js';
import { extractBearerToken } from '../auth/utils.js';
import * as bagService from './service.js';
import * as bagRepository from './repository.js';
import * as conversationRepository from '../conversations/repository.js';
import { emailValidationMiddleware } from '../../infrastructure/utils/email-validation.js';
import { verifyOwnerSession } from '../auth/service.js';
import { qrScanRateLimit } from '../security/middleware.js';
import { Bag } from '../types/index.js';

const router = express.Router();

interface AuthenticatedRequest extends Request {
  ownerEmail?: string;
  bag?: Bag;
}

async function verifyBagOwnership(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const session = await verifyOwnerSession(token);
  if (!session) {
    res.status(401).json({ error: 'Invalid or expired session' });
    return;
  }

  const bagId = req.params.bagId;
  if (!bagId) {
    res.status(400).json({ error: 'Bag ID is required' });
    return;
  }

  const bag = await bagRepository.getBagById(bagId);

  if (!bag || bag.owner_email !== session.email) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const authReq = req as AuthenticatedRequest;
  authReq.ownerEmail = session.email;
  authReq.bag = bag;
  next();
}

router.post(
  '/',
  emailValidationMiddleware({ fields: ['owner_email'] }),
  async (req, res): Promise<void> => {
    try {
      const validatedData = await createBagSchema.parseAsync(req.body);
      const clientIp = req.ip || req.connection.remoteAddress || undefined;
      const result = await bagService.createBagWithQR(validatedData, clientIp);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'issues' in error) {
        res.status(400).json({
          error: 'Validation failed',
          message: 'Invalid input data',
          details: (error as { issues: unknown }).issues,
        });
        return;
      }

      logger.error('Failed to create bag:', error);
      res.status(500).json({
        error: 'Internal server error',
        message:
          error instanceof Error ? error.message : 'Failed to create bag',
      });
    }
  }
);

router.get('/:shortId', qrScanRateLimit(), async (req, res): Promise<void> => {
  try {
    const parseResult = shortIdSchema.safeParse(req.params.shortId);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Invalid bag ID',
        message: 'The bag ID format is incorrect',
      });
      return;
    }

    const finderData = await bagRepository.getFinderPageData(parseResult.data);
    if (!finderData) {
      res.status(404).json({
        error: 'Bag not found',
        message: 'This bag ID does not exist',
      });
      return;
    }

    res.set({
      'Cache-Control': 'public, max-age=300',
      'X-Robots-Tag': 'noindex, nofollow',
    });

    res.json({
      success: true,
      data: finderData,
    });
  } catch (error) {
    logger.error('Failed to get bag data:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to load bag information',
    });
  }
});

router.get(
  '/:bagId/qr-code',
  verifyBagOwnership,
  async (req, res): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const bag = authReq.bag;
      if (!bag) {
        res.status(500).json({ error: 'Bag not found in request' });
        return;
      }
      const qrData = await bagService.getBagQRCode(bag.short_id);
      res.json({ success: true, data: qrData });
    } catch (error) {
      logger.error('Error getting QR code:', error);
      res.status(500).json({ error: 'Failed to generate QR code' });
    }
  }
);

router.get(
  '/:bagId/rotation-cooldown',
  verifyBagOwnership,
  async (req, res): Promise<void> => {
    try {
      const bagId = req.params.bagId;
      if (!bagId) {
        res.status(400).json({ error: 'Bag ID is required' });
        return;
      }
      const cooldown = await bagRepository.canRotateShortId(bagId);
      res.json({ success: true, data: cooldown });
    } catch (error) {
      logger.error('Error checking rotation cooldown:', error);
      res.status(500).json({ error: 'Failed to check cooldown' });
    }
  }
);

router.post(
  '/:bagId/rotate-short-id',
  verifyBagOwnership,
  async (req, res): Promise<void> => {
    try {
      const bagId = req.params.bagId;
      if (!bagId) {
        res.status(400).json({ error: 'Bag ID is required' });
        return;
      }
      const result = await bagService.rotateBagShortId(bagId);
      res.json({ success: true, data: result });
    } catch (error) {
      if (error instanceof Error && error.message.includes('once per week')) {
        res.status(429).json({ error: error.message });
        return;
      }
      logger.error('Error rotating short ID:', error);
      res.status(500).json({ error: 'Failed to rotate short ID' });
    }
  }
);

router.patch(
  '/:bagId/name',
  verifyBagOwnership,
  async (req, res): Promise<void> => {
    try {
      const bagId = req.params.bagId;
      if (!bagId) {
        res.status(400).json({ error: 'Bag ID is required' });
        return;
      }
      const { bag_name } = req.body;

      if (!bag_name || typeof bag_name !== 'string' || bag_name.length > 30) {
        res
          .status(400)
          .json({ error: 'Invalid bag name. Must be 1-30 characters.' });
        return;
      }

      await bagRepository.updateBagName(bagId, bag_name);
      res.json({ success: true, message: 'Bag name updated' });
    } catch (error) {
      if (error instanceof Error && error.message.includes('once per week')) {
        res.status(429).json({ error: error.message });
        return;
      }
      logger.error('Error updating bag name:', error);
      res.status(500).json({ error: 'Failed to update bag name' });
    }
  }
);

router.get(
  '/:bagId/name-cooldown',
  verifyBagOwnership,
  async (req, res): Promise<void> => {
    try {
      const bagId = req.params.bagId;
      if (!bagId) {
        res.status(400).json({ error: 'Bag ID is required' });
        return;
      }
      const cooldown = await bagRepository.canUpdateBagName(bagId);
      res.json({ success: true, data: cooldown });
    } catch (error) {
      logger.error('Error checking cooldown:', error);
      res.status(500).json({ error: 'Failed to check cooldown' });
    }
  }
);

router.patch(
  '/:bagId/status',
  verifyBagOwnership,
  async (req, res): Promise<void> => {
    try {
      const bagId = req.params.bagId;
      if (!bagId) {
        res.status(400).json({ error: 'Bag ID is required' });
        return;
      }
      const { status } = req.body;

      if (!['active', 'disabled'].includes(status)) {
        res
          .status(400)
          .json({ error: 'Invalid status. Must be "active" or "disabled".' });
        return;
      }

      await bagRepository.updateBagStatus(bagId, status);
      res.json({ success: true, message: `Bag ${status}` });
    } catch (error) {
      logger.error('Error updating bag status:', error);
      res.status(500).json({ error: 'Failed to update status' });
    }
  }
);

router.delete(
  '/:bagId',
  verifyBagOwnership,
  async (req, res): Promise<void> => {
    try {
      const bagId = req.params.bagId;
      if (!bagId) {
        res.status(400).json({ error: 'Bag ID is required' });
        return;
      }
      await bagRepository.deleteBag(bagId);
      res.json({ success: true, message: 'Bag deleted' });
    } catch (error) {
      logger.error('Error deleting bag:', error);
      res.status(500).json({ error: 'Failed to delete bag' });
    }
  }
);

router.post(
  '/:bagId/resolve-all',
  verifyBagOwnership,
  async (req, res): Promise<void> => {
    try {
      const bagId = req.params.bagId;
      if (!bagId) {
        res.status(400).json({ error: 'Bag ID is required' });
        return;
      }
      const result =
        await conversationRepository.resolveAndArchiveAllByBagId(bagId);
      res.json({
        success: true,
        message: `${result.count} conversation${result.count !== 1 ? 's' : ''} resolved and archived`,
        data: { count: result.count },
      });
    } catch (error) {
      logger.error('Error resolving all conversations:', error);
      res.status(500).json({ error: 'Failed to resolve conversations' });
    }
  }
);

export default router;
