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

export type IconSize = 'small' | 'medium' | 'large';
export type IconColor = 'currentColor';

import {
  SignalIcon,
  WhatsAppIcon,
  TelegramIcon,
  InstagramIcon,
  brandColors as brandIconColors,
} from './BrandIcons';

export { SignalIcon, WhatsAppIcon, TelegramIcon, InstagramIcon };

export const brandColors = brandIconColors;

interface IconProps {
  size?: IconSize;
  color?: IconColor;
  label?: string;
  className?: string;
}

const IconWrapper = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <span className={`inline-flex items-center justify-center ${className}`}>
    {children}
  </span>
);

export const SuccessIcon = ({
  size: _size = 'medium',
  color = 'currentColor',
  label = '',
  className = '',
}: IconProps) => (
  <IconWrapper className={className}>
    <CheckCircleIcon
      spacing="compact"
      color={color}
      label={label || 'Success'}
    />
  </IconWrapper>
);

export const ErrorIcon = ({
  size: _size = 'medium',
  color = 'currentColor',
  label = '',
  className = '',
}: IconProps) => (
  <IconWrapper className={className}>
    <CrossCircleIcon spacing="compact" color={color} label={label || 'Error'} />
  </IconWrapper>
);

export const AlertIcon = ({
  size: _size = 'medium',
  color = 'currentColor',
  label = '',
  className = '',
}: IconProps) => (
  <IconWrapper className={className}>
    <WarningIcon spacing="compact" color={color} label={label || 'Warning'} />
  </IconWrapper>
);

export const InfoIcon = ({
  size: _size = 'medium',
  color = 'currentColor',
  label = '',
  className = '',
}: IconProps) => (
  <IconWrapper className={className}>
    <InformationCircleIcon
      spacing="compact"
      color={color}
      label={label || 'Information'}
    />
  </IconWrapper>
);

export const QuestionIcon = ({
  size: _size = 'medium',
  color = 'currentColor',
  label = '',
  className = '',
}: IconProps) => (
  <IconWrapper className={className}>
    <QuestionCircleIcon
      spacing="compact"
      color={color}
      label={label || 'Question'}
    />
  </IconWrapper>
);

export const CheckIcon = ({
  size: _size = 'medium',
  color = 'currentColor',
  label = '',
  className = '',
}: IconProps) => (
  <IconWrapper className={className}>
    <CheckMarkIcon spacing="compact" color={color} label={label || 'Check'} />
  </IconWrapper>
);

export const PrivacyIcon = ({
  size: _size = 'medium',
  color = 'currentColor',
  label = '',
  className = '',
}: IconProps) => (
  <IconWrapper className={className}>
    <LockLockedIcon
      spacing="compact"
      color={color}
      label={label || 'Privacy'}
    />
  </IconWrapper>
);

export const SecureIcon = ({
  size: _size = 'medium',
  color = 'currentColor',
  label = '',
  className = '',
}: IconProps) => (
  <IconWrapper className={className}>
    <ShieldIcon spacing="compact" color={color} label={label || 'Secure'} />
  </IconWrapper>
);

export const PhoneContactIcon = ({
  size: _size = 'medium',
  color = 'currentColor',
  label = '',
  className = '',
}: IconProps) => (
  <IconWrapper className={className}>
    <PhoneIcon spacing="compact" color={color} label={label || 'Phone'} />
  </IconWrapper>
);

export const MobileIcon = ({
  size: _size = 'medium',
  color = 'currentColor',
  label = '',
  className = '',
}: IconProps) => (
  <IconWrapper className={className}>
    <DeviceMobileIcon
      spacing="compact"
      color={color}
      label={label || 'Mobile'}
    />
  </IconWrapper>
);

export const MailIcon = ({
  size: _size = 'medium',
  color = 'currentColor',
  label = '',
  className = '',
}: IconProps) => (
  <IconWrapper className={className}>
    <EmailIcon spacing="compact" color={color} label={label || 'Email'} />
  </IconWrapper>
);

export const MessageIcon = ({
  size: _size = 'medium',
  color = 'currentColor',
  label = '',
  className = '',
}: IconProps) => (
  <IconWrapper className={className}>
    <CommentIcon spacing="compact" color={color} label={label || 'Message'} />
  </IconWrapper>
);

export const MessengerIcon = ({
  size: _size = 'medium',
  color = 'currentColor',
  label = '',
  className = '',
}: IconProps) => (
  <IconWrapper className={className}>
    <SendIcon spacing="compact" color={color} label={label || 'Messenger'} />
  </IconWrapper>
);

export const PrintIcon = ({
  size: _size = 'medium',
  color = 'currentColor',
  label = '',
  className = '',
}: IconProps) => (
  <IconWrapper className={className}>
    <PrinterIcon spacing="compact" color={color} label={label || 'Print'} />
  </IconWrapper>
);

export const DownloadActionIcon = ({
  size: _size = 'medium',
  color = 'currentColor',
  label = '',
  className = '',
}: IconProps) => (
  <IconWrapper className={className}>
    <DownloadIcon spacing="compact" color={color} label={label || 'Download'} />
  </IconWrapper>
);

export const PlusIcon = ({
  size: _size = 'medium',
  color = 'currentColor',
  label = '',
  className = '',
}: IconProps) => (
  <IconWrapper className={className}>
    <AddIcon spacing="compact" color={color} label={label || 'Add'} />
  </IconWrapper>
);

export const BagIcon = ({
  size: _size = 'medium',
  color = 'currentColor',
  label = '',
  className = '',
}: IconProps) => (
  <IconWrapper className={className}>
    <BriefcaseIcon spacing="compact" color={color} label={label || 'Bag'} />
  </IconWrapper>
);

export const ArchiveIcon = ({
  size: _size = 'medium',
  color = 'currentColor',
  label = '',
  className = '',
}: IconProps) => (
  <IconWrapper className={className}>
    <ArchiveBoxIcon
      spacing="compact"
      color={color}
      label={label || 'Archive'}
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
