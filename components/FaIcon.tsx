import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faArrowLeft,
  faCalendarDay,
  faCalendarDays,
  faChartLine,
  faChartSimple,
  faCheck,
  faChevronDown,
  faChevronLeft,
  faChevronRight,
  faCircleCheck,
  faClock,
  faCloudArrowDown,
  faCloudArrowUp,
  faDeleteLeft,
  faFileExport,
  faFileImport,
  faFileLines,
  faFingerprint,
  faFire,
  faFolderOpen,
  faGear,
  faHome,
  faHourglassHalf,
  faLock,
  faMagnifyingGlass,
  faMoon,
  faPlay,
  faPlus,
  faRotate,
  faScroll,
  faServer,
  faShare,
  faShieldHalved,
  faSpinner,
  faTrashArrowUp,
  faTrashCan,
  faUpload,
  faVolumeHigh,
  faVolumeXmark,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

export type FaIconName =
  | 'arrow-left'
  | 'calendar-day'
  | 'calendar-days'
  | 'chart-line'
  | 'chart-simple'
  | 'check'
  | 'chevron-down'
  | 'chevron-left'
  | 'chevron-right'
  | 'circle-check'
  | 'clock'
  | 'cloud-arrow-down'
  | 'cloud-arrow-up'
  | 'delete-left'
  | 'file-export'
  | 'file-import'
  | 'file-lines'
  | 'fingerprint'
  | 'fire'
  | 'folder-open'
  | 'gear'
  | 'home'
  | 'hourglass-half'
  | 'lock'
  | 'magnifying-glass'
  | 'moon'
  | 'play'
  | 'plus'
  | 'rotate'
  | 'scroll'
  | 'server'
  | 'share'
  | 'shield-halved'
  | 'spinner'
  | 'trash-arrow-up'
  | 'trash-can'
  | 'upload'
  | 'volume-high'
  | 'volume-xmark'
  | 'xmark';

const ICON_MAP: Record<FaIconName, IconDefinition> = {
  'arrow-left': faArrowLeft,
  'calendar-day': faCalendarDay,
  'calendar-days': faCalendarDays,
  'chart-line': faChartLine,
  'chart-simple': faChartSimple,
  check: faCheck,
  'chevron-down': faChevronDown,
  'chevron-left': faChevronLeft,
  'chevron-right': faChevronRight,
  'circle-check': faCircleCheck,
  clock: faClock,
  'cloud-arrow-down': faCloudArrowDown,
  'cloud-arrow-up': faCloudArrowUp,
  'delete-left': faDeleteLeft,
  'file-export': faFileExport,
  'file-import': faFileImport,
  'file-lines': faFileLines,
  fingerprint: faFingerprint,
  fire: faFire,
  'folder-open': faFolderOpen,
  gear: faGear,
  home: faHome,
  'hourglass-half': faHourglassHalf,
  lock: faLock,
  'magnifying-glass': faMagnifyingGlass,
  moon: faMoon,
  play: faPlay,
  plus: faPlus,
  rotate: faRotate,
  scroll: faScroll,
  server: faServer,
  share: faShare,
  'shield-halved': faShieldHalved,
  spinner: faSpinner,
  'trash-arrow-up': faTrashArrowUp,
  'trash-can': faTrashCan,
  upload: faUpload,
  'volume-high': faVolumeHigh,
  'volume-xmark': faVolumeXmark,
  xmark: faXmark,
};

interface Props {
  name: FaIconName;
  className?: string;
  spin?: boolean;
}

const FaIcon: React.FC<Props> = ({ name, className, spin }) => {
  return <FontAwesomeIcon icon={ICON_MAP[name]} className={className} spin={spin} />;
};

export default FaIcon;
