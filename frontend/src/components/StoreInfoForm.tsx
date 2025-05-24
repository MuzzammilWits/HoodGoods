// src/components/StoreInfoForm.tsx
import React from 'react';

interface StoreInfoFormProps {
  storeName: string;
  onStoreNameChange: (name: string) => void;
  isSubmitting: boolean;
}

const StoreInfoForm: React.FC<StoreInfoFormProps> = ({
  storeName,
  onStoreNameChange,
  isSubmitting,
}) => {
  return (
    <section className="store-info-section">
      <h2>Store Name</h2>
      <p className="store-name-disclaimer"> {/* Added className here */}
        Your store name is your unique brand on our platform and cannot be changed later. Choose wisely!
      </p>
      <fieldset className="form-group">
        <input
          type="text"
          id="storeName"
          value={storeName}
          onChange={(e) => onStoreNameChange(e.target.value)}
          placeholder="Enter your store name"
          required
          disabled={isSubmitting}
        />
      </fieldset>
    </section>
  );
};

export default StoreInfoForm;