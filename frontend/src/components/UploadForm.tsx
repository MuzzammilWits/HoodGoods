// frontend/src/components/UploadForm.tsx
import { useState } from 'react';

const UploadForm = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('http://localhost:3000/upload/image', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    setPreviewUrl(data.url);
  };

  return (
    <div>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleUpload}>Upload</button>
      {previewUrl && <img src={previewUrl} alt="Uploaded" style={{ width: 200 }} />}
    </div>
  );
};

export default UploadForm;
