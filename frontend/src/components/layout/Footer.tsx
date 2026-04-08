import React from 'react';

const Footer = () => {
  const handleEmailClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    // Open Gmail compose window with pre-filled email
    const email = 'cvvinteam@gmail.com';
    const subject = encodeURIComponent('Contact from CVVIN Platform');
    const body = encodeURIComponent('Hello CVVIN Team,\n\n');
    const gmailUrl = `https://mail.google.com/mail/?view=cm&to=${email}&su=${subject}&body=${body}`;
    window.open(gmailUrl, '_blank');
  };

  return (
    <footer className="w-full bg-card border-t border-border mt-auto">
      <div className="container mx-auto px-6 py-6">
        <div className="flex flex-col items-center space-y-2 sm:flex-row sm:justify-center sm:space-y-0">
          <p className="text-sm text-muted-foreground">
            © 2025 CVVIN. Built for interview success.
          </p>
          <span className="hidden sm:block sm:mx-4 text-muted-foreground">•</span>
          <a 
            href="mailto:cvvinteam@gmail.com" 
            onClick={handleEmailClick}
            className="text-sm text-primary hover:text-primary-hover transition-smooth cursor-pointer"
          >
            Contact Us: cvvinteam@gmail.com
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;