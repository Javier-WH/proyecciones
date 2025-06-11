/* eslint-disable react-hooks/exhaustive-deps */
import { message } from 'antd';
import React, { useState, useRef, useEffect, ChangeEvent } from 'react';
import MalePlaceholder from '../../assets/malePlaceHolder.svg';
import FemalePlaceholder from '../../assets/femalePlaceHolder.svg';

function ImageUploader({ filename, gender }: { filename: string | undefined, gender: string | undefined }) {
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [serverPhoto, setServerPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Obtener foto del servidor
  useEffect(() => {
    if (!filename) {
      setServerPhoto(null);
      return;
    }

    // Versión actualizada con parámetro de caché único
    const cacheBuster = `?t=${refreshCounter}`;
    const baseUrl = import.meta.env.MODE === 'development'
      ? `http://localhost:3000/photo/${filename}`
      : `/photo/${filename}`;

    const photoUrl = `${baseUrl}${cacheBuster}`;

    fetch(photoUrl)
      .then(response => {
        if (!response.ok) throw new Error("Error en la foto");
        return response.blob();
      })
      .then(blob => {
        const objectUrl = URL.createObjectURL(blob);
        setServerPhoto(prev => {
          if (prev) URL.revokeObjectURL(prev);
          return objectUrl;
        });
      })
      .catch(() => {
        setServerPhoto(prev => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
      });

  }, [filename, refreshCounter]);

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      if (serverPhoto) URL.revokeObjectURL(serverPhoto);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, []);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Crear preview inmediato
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
        // Forzar nueva carga de la foto del servidor
        setRefreshCounter(prev => prev + 1);
      } else {
        message.error("Error al actualizar la foto");
        // Eliminar preview si falla
        setPreviewUrl('');
      }
    } catch (error) {
      message.error("Error al actualizar la foto");
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

  // Determinar qué imagen mostrar
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