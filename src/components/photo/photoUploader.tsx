/* eslint-disable react-hooks/exhaustive-deps */
import { message } from 'antd';
import React, { useState, useRef, useEffect, ChangeEvent } from 'react';
import MalePlaceholder from '../../assets/malePlaceHolder.svg';
import FemalePlaceholder from '../../assets/femalePlaceHolder.svg';
import  fetchPhoto  from '../../fetch/fetchPhoto';
import { useQuery, useQueryClient } from '@tanstack/react-query';


function ImageUploader({ filename, gender }: { filename: string | undefined, gender: string | undefined }) {
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient(); 

  const { data: serverPhoto } = useQuery<string | null, Error>({
    queryKey: ['teacherPhoto', filename], 
    queryFn: () => filename ? fetchPhoto(filename) : Promise.resolve(null),
    enabled: !!filename, 
    staleTime: 60 * 60 * 1000, 
    gcTime: 5 * 60 * 1000, 
  });
 

 // Revocar la URL de la vista previa cuando el componente se desmonta
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);


  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Revocar la URL de la vista previa anterior antes de crear una nueva
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Subir imagen
    handleUpload(file);
  };

  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('name', filename || 'unknown');
    formData.append('foto', file);

    try {
      const apiUrl = import.meta.env.MODE === 'development'
        ? 'http://localhost:3000/photo'
        : '/photo';

      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        message.success("Foto actualizada correctamente");
        if (filename) {
          queryClient.invalidateQueries({ queryKey: ['teacherPhoto', filename] });
        }
        setPreviewUrl(''); 
      } else {
        message.error("Error al actualizar la foto");
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl('');
      }
    } catch (error) {
      message.error("Error al actualizar la foto");
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    }
  };

  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 'bold',
    opacity: 0,
    transition: 'opacity 0.3s',
    width: '170px',
    height: '170px',
  };

  const displayImage = previewUrl || serverPhoto || (gender === '1' ? MalePlaceholder : FemalePlaceholder);

  return (
    <div>
      <div
        onClick={handleClick}
        style={{
          width: '170px',
          height: '170px',
          position: 'relative',
          cursor: 'pointer',
          border: '1px solid #ccc',
          borderRadius: '4px',
        }}
        onMouseOver={e => {
          e.currentTarget.style.borderColor = '#4caf50';
          const overlay = e.currentTarget.querySelector('.overlay') as HTMLElement;
          if (overlay) overlay.style.opacity = '1';
        }}
        onMouseOut={e => {
          e.currentTarget.style.borderColor = '#ccc';
          const overlay = e.currentTarget.querySelector('.overlay') as HTMLElement;
          if (overlay) overlay.style.opacity = '0';
        }}
      >
        <img
          src={displayImage}
          alt="Preview"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
        <div className="overlay" style={overlayStyle}>
          Cambiar imagen
        </div>
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
}

export default ImageUploader;