// src/components/SubmissionStatus.tsx
import React from 'react';

interface SubmissionStatusProps {
    error: string | null;
    success: string | null;
}

const SubmissionStatus: React.FC<SubmissionStatusProps> = ({ error, success }) => {
    if (!error && !success) return null;

    return (
        <>
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
        </>
    );
};

export default SubmissionStatus;