import React from 'react';
// import { MenuItem, ViewKey } from '../types';

// interface NavbarProps {
//   menuItems: MenuItem[];
//   activeView: ViewKey;
//   onNavigate: (viewKey: ViewKey) => void;
// }

// const Navbar: React.FC<NavbarProps> = ({ menuItems, activeView, onNavigate }) => {
//   return (
//     <nav className="bg-primary-700 text-white shadow-lg">
//       <div className="container mx-auto px-4">
//         <div className="flex items-center justify-between h-16">
//           <div className="flex items-center">
//             <span className="font-bold text-xl">OrgEventManager</span>
//           </div>
//           <div className="hidden md:flex space-x-2">
//             {/* Navigation items removed as MainMenuView is now primary navigation */}
//           </div>
//         </div>
//       </div>
//       <div className="md:hidden p-2">
//          {/* Mobile Navigation items removed */}
//       </div>
//     </nav>
//   );
// };

// export default Navbar;

// This component is largely unused now. App.tsx provides a simple header.
// Keeping the file for potential future use as a simple banner or if a different nav structure is needed.
const DeprecatedNavbar: React.FC = () => {
    return null; 
};
export default DeprecatedNavbar;