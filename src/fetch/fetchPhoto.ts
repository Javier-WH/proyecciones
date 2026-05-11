const fetchPhoto = async (photoId: string) => {
  const photoUrl = import.meta.env.MODE === 'development'
    ? `/photo/${photoId}`
    : `/photo/${photoId}`;
  const response = await fetch(photoUrl);
  if (!response.ok) {
    return null;
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

export default fetchPhoto;