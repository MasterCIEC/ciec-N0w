import React from 'react';

const LOGO_LIGHT = 'https://zsbyslmvvfzhpenfpxzm.supabase.co/storage/v1/object/sign/LOGO%20ciec/LogotipoBLUE@1.5x.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9hMjE5ZTgyYy1jOWQzLTRiMjItOTQ0ZC03YzZjZmVmYmNjYzEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJMT0dPIGNpZWMvTG9nb3RpcG9CTFVFQDEuNXgucG5nIiwiaWF0IjoxNzU1MDk5OTA3LCJleHAiOjIwNzA0NTk5MDd9.sQsghIZa4DDmezbrvGXteKpIgdMdaXuFlHVML_8q5_Q';
const LOGO_DARK = 'https://zsbyslmvvfzhpenfpxzm.supabase.co/storage/v1/object/sign/LOGO%20ciec/LogotipoWHITE@1.5x.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9hMjE5ZTgyYy1jOWQzLTRiMjItOTQ0ZC03YzZjZmVmYmNjYzEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJMT0dPIGNpZWMvTG9nb3RpcG9XSElURUAxLjV4LnBuZyIsImlhdCI6MTc1NTA5OTkyMSwiZXhwIjoyMDcwNDU5OTIxfQ.W6bVFT6fq93Wd5v-etzTczpx3vilE3fAdvkR3vvjdys';

interface AppLogoProps {
  className?: string;
  variant?: 'auto' | 'light' | 'dark';
}

const AppLogo: React.FC<AppLogoProps> = ({ className, variant = 'auto' }) => {
  if (variant === 'light') {
    return <img src={LOGO_LIGHT} alt="CIEC.Now Logo" className={`${className} object-contain`} />;
  }
  if (variant === 'dark') {
    return <img src={LOGO_DARK} alt="CIEC.Now Logo" className={`${className} object-contain`} />;
  }
  
  // 'auto' variant
  return (
    <>
      <img src={LOGO_LIGHT} alt="CIEC.Now Logo" className={`dark:hidden object-contain ${className}`} />
      <img src={LOGO_DARK} alt="CIEC.Now Logo" className={`hidden dark:block object-contain ${className}`} />
    </>
  );
};

export default AppLogo;