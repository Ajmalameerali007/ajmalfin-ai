import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../contexts/AppContext';

const ActivityToast: React.FC = () => {
    const { activityLog } = useAppContext();
    const [visible, setVisible] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (activityLog) {
            setMessage(activityLog.message);
            setVisible(true);
            const timer = setTimeout(() => {
                setVisible(false);
            }, 3000); // Hide after 3 seconds

            return () => clearTimeout(timer);
        }
    }, [activityLog]);

    if (!visible) return null;

    return (
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="bg-accent-lemon text-black font-semibold px-4 py-2 rounded-full shadow-lg">
                {message}
            </div>
        </div>
    );
};

export default ActivityToast;
