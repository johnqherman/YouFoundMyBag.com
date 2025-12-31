import express from 'express';
import {
  createBagSchema,
  shortIdSchema,
} from '../../infrastructure/utils/validation.js';
import * as bagService from './service.js';
import * as bagRepository from './repository.js';

const router = express.Router();

router.post('/', async (req, res): Promise<void> => {
  try {
    const validatedData = createBagSchema.parse(req.body);
    const result = await bagService.createBagWithQR(validatedData);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    if (error.issues) {
      res.status(400).json({
        error: 'Validation failed',
        message: 'Invalid input data',
        details: error.issues,
      });
      return;
    }

    console.error('Failed to create bag:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'Failed to create bag',
    });
  }
});

router.get('/:shortId', async (req, res): Promise<void> => {
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
    console.error('Failed to get bag data:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to load bag information',
    });
  }
});

export default router;
