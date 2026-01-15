import CheckCircleIcon from '@atlaskit/icon/core/check-circle';
import CrossCircleIcon from '@atlaskit/icon/core/cross-circle';
import WarningIcon from '@atlaskit/icon/core/warning';
import InformationCircleIcon from '@atlaskit/icon/core/information-circle';
import QuestionCircleIcon from '@atlaskit/icon/core/question-circle';
import LockLockedIcon from '@atlaskit/icon/core/lock-locked';
import PhoneIcon from '@atlaskit/icon/core/phone';
import DeviceMobileIcon from '@atlaskit/icon/core/device-mobile';
import EmailIcon from '@atlaskit/icon/core/email';
import CommentIcon from '@atlaskit/icon/core/comment';
import SendIcon from '@atlaskit/icon/core/send';
import PrinterIcon from '@atlaskit/icon/core/printer';
import DownloadIcon from '@atlaskit/icon/core/download';
import AddIcon from '@atlaskit/icon/core/add';
import ShieldIcon from '@atlaskit/icon/core/shield';
import BriefcaseIcon from '@atlaskit/icon/core/briefcase';
import CheckMarkIcon from '@atlaskit/icon/core/check-mark';
import ArchiveBoxIcon from '@atlaskit/icon/core/archive-box';
import SettingsIcon from '@atlaskit/icon/core/settings';
import EditIcon from '@atlaskit/icon/core/edit';
import RefreshIcon from '@atlaskit/icon/core/refresh';
import LightbulbIcon from '@atlaskit/icon/core/lightbulb';
import GridIcon from '@atlaskit/icon/core/grid';
import DeleteIconAtlas from '@atlaskit/icon/core/delete';
import type { IconSize, IconColor } from '../../types/index.js';

import {
  SignalIcon,
  WhatsAppIcon,
  TelegramIcon,
  InstagramIcon,
  brandColors as brandIconColors,
} from './BrandIcons.js';

export { SignalIcon, WhatsAppIcon, TelegramIcon, InstagramIcon };

export const brandColors = brandIconColors;

interface IconProps {
  size?: IconSize;
  color?: IconColor;
  label?: string;
  className?: string;
}

const getScaleClass = (size: IconSize): string => {
  switch (size) {
    case 'small':
      return '';
    case 'medium':
      return 'scale-[2]';
    case 'large':
      return 'scale-[3]';
  }
};

const IconWrapper = ({
  children,
  className = '',
  size = 'small',
}: {
  children: React.ReactNode;
  className?: string;
  size?: IconSize;
}) => (
  <span
    className={`inline-flex items-center justify-center ${size !== 'small' ? 'p-2' : ''} ${getScaleClass(size)} ${className}`}
  >
    {children}
  </span>
);

export const SuccessIcon = ({
  size = 'small',
  color = 'currentColor',
  label = '',
  className = '',
}: IconProps) => (
  <IconWrapper className={className} size={size}>
    <CheckCircleIcon
      spacing="compact"
      color={color}
      label={label || 'Success'}
    />
  </IconWrapper>
);

export const ErrorIcon = ({
  size = 'small',
  color = 'currentColor',
  label = '',
  className = '',
}: IconProps) => (
  <IconWrapper className={className} size={size}>
    <CrossCircleIcon spacing="compact" color={color} label={label || 'Error'} />
  </IconWrapper>
);

export const AlertIcon = ({
  size = 'small',
  color = 'currentColor',
  label = '',
  className = '',
}: IconProps) => (
  <IconWrapper className={className} size={size}>
    <WarningIcon spacing="compact" color={color} label={label || 'Warning'} />
  </IconWrapper>
);

export const InfoIcon = ({
  size = 'small',
  color = 'currentColor',
  label = '',
  className = '',
}: IconProps) => (
  <IconWrapper className={className} size={size}>
    <InformationCircleIcon
      spacing="compact"
      color={color}
      label={label || 'Information'}
    />
  </IconWrapper>
);

export const QuestionIcon = ({
  size = 'small',
  color = 'currentColor',
  label = '',
  className = '',
}: IconProps) => (
  <IconWrapper className={className} size={size}>
    <QuestionCircleIcon
      spacing="compact"
      color={color}
      label={label || 'Question'}
    />
  </IconWrapper>
);

export const CheckIcon = ({
  size = 'small',
  color = 'currentColor',
  label = '',
  className = '',
}: IconProps) => (
  <IconWrapper className={className} size={size}>
    <CheckMarkIcon spacing="compact" color={color} label={label || 'Check'} />
  </IconWrapper>
);

export const PrivacyIcon = ({
  size = 'small',
  color = 'currentColor',
  label = '',
  className = '',
}: IconProps) => (
  <IconWrapper className={className} size={size}>
    <LockLockedIcon
      spacing="compact"
      color={color}
      label={label || 'Privacy'}
    />
  </IconWrapper>
);

export const SecureIcon = ({
  size = 'small',
  color = 'currentColor',
  label = '',
  className = '',
}: IconProps) => (
  <IconWrapper className={className} size={size}>
    <ShieldIcon spacing="compact" color={color} label={label || 'Secure'} />
  </IconWrapper>
);

export const PhoneContactIcon = ({
  size = 'small',
  color = 'currentColor',
  label = '',
  className = '',
}: IconProps) => (
  <IconWrapper className={className} size={size}>
    <PhoneIcon spacing="compact" color={color} label={label || 'Phone'} />
  </IconWrapper>
);

export const MobileIcon = ({
  size = 'small',
  color = 'currentColor',
  label = '',
  className = '',
}: IconProps) => (
  <IconWrapper className={className} size={size}>
    <DeviceMobileIcon
      spacing="compact"
      color={color}
      label={label || 'Mobile'}
    />
  </IconWrapper>
);

export const MailIcon = ({
  size = 'small',
  color = 'currentColor',
  label = '',
  className = '',
}: IconProps) => (
  <IconWrapper className={className} size={size}>
    <EmailIcon spacing="compact" color={color} label={label || 'Email'} />
  </IconWrapper>
);

export const MessageIcon = ({
  size = 'small',
  color = 'currentColor',
  label = '',
  className = '',
}: IconProps) => (
  <IconWrapper className={className} size={size}>
    <CommentIcon spacing="compact" color={color} label={label || 'Message'} />
  </IconWrapper>
);

export const MessengerIcon = ({
  size = 'small',
  color = 'currentColor',
  label = '',
  className = '',
}: IconProps) => (
  <IconWrapper className={className} size={size}>
    <SendIcon spacing="compact" color={color} label={label || 'Messenger'} />
  </IconWrapper>
);

export const PrintIcon = ({
  size = 'small',
  color = 'currentColor',
  label = '',
  className = '',
}: IconProps) => (
  <IconWrapper className={className} size={size}>
    <PrinterIcon spacing="compact" color={color} label={label || 'Print'} />
  </IconWrapper>
);

export const DownloadActionIcon = ({
  size = 'small',
  color = 'currentColor',
  label = '',
  className = '',
}: IconProps) => (
  <IconWrapper className={className} size={size}>
    <DownloadIcon spacing="compact" color={color} label={label || 'Download'} />
  </IconWrapper>
);

export const PlusIcon = ({
  size = 'small',
  color = 'currentColor',
  label = '',
  className = '',
}: IconProps) => (
  <IconWrapper className={className} size={size}>
    <AddIcon spacing="compact" color={color} label={label || 'Add'} />
  </IconWrapper>
);

export const BagIcon = ({
  size = 'small',
  color = 'currentColor',
  label = '',
  className = '',
}: IconProps) => (
  <IconWrapper className={className} size={size}>
    <BriefcaseIcon spacing="compact" color={color} label={label || 'Bag'} />
  </IconWrapper>
);

export const ArchiveIcon = ({
  size = 'small',
  color = 'currentColor',
  label = '',
  className = '',
}: IconProps) => (
  <IconWrapper className={className} size={size}>
    <ArchiveBoxIcon
      spacing="compact"
      color={color}
      label={label || 'Archive'}
    />
  </IconWrapper>
);

export const BagSettingsIcon = ({
  size = 'small',
  color = 'currentColor',
  label = '',
  className = '',
}: IconProps) => (
  <IconWrapper className={className} size={size}>
    <SettingsIcon spacing="compact" color={color} label={label || 'Settings'} />
  </IconWrapper>
);

export const EditPencilIcon = ({
  size = 'small',
  color = 'currentColor',
  label = '',
  className = '',
}: IconProps) => (
  <IconWrapper className={className} size={size}>
    <EditIcon spacing="compact" color={color} label={label || 'Edit'} />
  </IconWrapper>
);

export const RefreshRotateIcon = ({
  size = 'small',
  color = 'currentColor',
  label = '',
  className = '',
}: IconProps) => (
  <IconWrapper className={className} size={size}>
    <RefreshIcon spacing="compact" color={color} label={label || 'Refresh'} />
  </IconWrapper>
);

export const StatusIcon = ({
  size = 'small',
  color = 'currentColor',
  label = '',
  className = '',
}: IconProps) => (
  <IconWrapper className={className} size={size}>
    <LightbulbIcon spacing="compact" color={color} label={label || 'Status'} />
  </IconWrapper>
);

export const QRCodeIcon = ({
  size = 'small',
  color = 'currentColor',
  label = '',
  className = '',
}: IconProps) => (
  <IconWrapper className={className} size={size}>
    <GridIcon spacing="compact" color={color} label={label || 'QR Code'} />
  </IconWrapper>
);

export const DeleteIcon = ({
  size = 'small',
  color = 'currentColor',
  label = '',
  className = '',
}: IconProps) => (
  <IconWrapper className={className} size={size}>
    <DeleteIconAtlas
      spacing="compact"
      color={color}
      label={label || 'Delete'}
    />
  </IconWrapper>
);

export const getContactMethodIcon = (type: string) => {
  switch (type) {
    case 'sms':
      return PhoneContactIcon;
    case 'whatsapp':
      return WhatsAppIcon;
    case 'email':
      return MailIcon;
    case 'instagram':
      return InstagramIcon;
    case 'telegram':
      return TelegramIcon;
    case 'signal':
      return SignalIcon;
    default:
      return PhoneContactIcon;
  }
};
