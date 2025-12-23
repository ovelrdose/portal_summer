import React from 'react';
import { Alert } from 'react-bootstrap';
import { formatDateTimeDisplay } from '../utils/dateUtils';

const LockedContentAlert = ({ unlockDatetime, variant = 'info', size = 'normal' }) => {
  const iconSize = size === 'large' ? 'fs-1' : 'fs-3';

  return (
    <Alert variant={variant} className="d-flex align-items-center">
      <i className={`bi bi-lock-fill ${iconSize} me-3`}></i>
      <div>
        <strong>Этот контент станет доступен</strong>
        <br />
        <span className="text-muted">
          {formatDateTimeDisplay(unlockDatetime)}
        </span>
      </div>
    </Alert>
  );
};

export default LockedContentAlert;
