
import React from 'react';

const Spinner: React.FC = () => {
  return (
    <div className="w-12 h-12 border-4 border-t-transparent border-light-accent dark:border-dark-accent rounded-full animate-spin"></div>
  );
};

export default Spinner;
