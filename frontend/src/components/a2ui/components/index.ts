/**
 * A2UI Components - 组件导出
 */

// Button
export {
  A2UIButton,
  type A2UIButtonProps,
  type ButtonVariant,
  type ButtonSize
} from './A2UIButton';

// Card
export {
  A2UICard,
  A2UICardHeader,
  A2UICardContent,
  A2UICardFooter,
  type A2UICardProps,
  type CardVariant
} from './A2UICard';

// TypingIndicator
export {
  A2UITypingIndicator,
  A2UITypingDots,
  type A2UITypingIndicatorProps,
  type TypingAnimation
} from './A2UITypingIndicator';

// Input
export {
  A2UIInput,
  type A2UIInputProps,
  type InputVariant,
  type InputSize
} from './A2UIInput';

// Alert
export {
  A2UIAlert,
  A2UIAlertGroup,
  type A2UIAlertProps,
  type AlertType
} from './A2UIAlert';

// 法务专用卡片
export { ContractCompareCard } from './ContractCompareCard';
export { FeeEstimateCard } from './FeeEstimateCard';
export { LawyerCard } from './LawyerCard';

// 移动端千问风格组件
export {
  CollapsibleCard,
  HorizontalSwipeList,
  BottomActionBar,
  FullWidthCard,
} from './MobileCardWrapper';
