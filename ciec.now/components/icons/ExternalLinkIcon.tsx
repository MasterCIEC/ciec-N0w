
import React from 'react';

const ExternalLinkIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M10.5 3.75a.75.75 0 000 1.5h4.19L6.47 13.47a.75.75 0 101.06 1.06L15.75 6.31v4.19a.75.75 0 001.5 0V4.5a.75.75 0 00-.75-.75h-6z" />
    <path d="M5.25 4.5A2.25 2.25 0 003 6.75v10.5A2.25 2.25 0 005.25 19.5h10.5A2.25 2.25 0 0018 17.25V12a.75.75 0 00-1.5 0v5.25a.75.75 0 01-.75.75H5.25a.75.75 0 01-.75-.75V6.75a.75.75 0 01.75-.75H9a.75.75 0 000-1.5H5.25z" />
  </svg>
);
export default ExternalLinkIcon;
