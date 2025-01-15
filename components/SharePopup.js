import { useState, useEffect } from 'react';
import { FaShareAlt, FaFacebook, FaTwitter, FaLinkedin, FaTimes } from 'react-icons/fa';
import { usePathname } from 'next/navigation';
import { Button } from './ui/button';

const HOME_URL = 'https://www.spinpapa.com';

const SharePopup = ({ url, buttonVariant = 'blue' }) => {
    const [showPopup, setShowPopup] = useState(false);
    const [isHomepage, setIsHomepage] = useState(false);
    const currentPath = usePathname();
    url = HOME_URL+url;

    useEffect(() => {
        if (currentPath=== '/') {
            setIsHomepage(true);
        } else {
            setIsHomepage(false);
        }
    }, [currentPath]);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(url);
        alert('URL copied to clipboard!');
    };

    const togglePopup = () => {
        setShowPopup(!showPopup);
    };

    return (
        <div className="relative">
            {buttonVariant === 'blue' ? (
                <Button
                    onClick={togglePopup} 
                  >
                    <FaShareAlt className="mr-2" />
                    Share
                </Button>
            ) : (
                <button
                    onClick={togglePopup}
                    className="flex items-center"
                >
                    <FaShareAlt className="mr-2" size={24}/>
                </button>
            )}

            {showPopup && (
                <div className="fixed inset-0 bg-gray-700 bg-opacity-50 flex justify-center items-center z-50 dark:bg-gray-900 dark:bg-opacity-80">
                    <div className="bg-white p-6 rounded shadow-lg dark:bg-gray-800 dark:text-gray-100 relative">
                        <button
                            onClick={togglePopup}
                            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full dark:bg-red-700 dark:text-gray-100"
                        >
                            <FaTimes />
                        </button>
                        {isHomepage ? (
                            <p>Save your wheel to share it</p>
                        ) : (
                            <>
                                <input
                                    type="text"
                                    value={url}
                                    readOnly
                                    className="border p-2 rounded w-full mb-4 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                                />
                                <button
                                    onClick={copyToClipboard}
                                    className="bg-green-500 text-white p-2 rounded mb-4 w-full dark:bg-green-700 dark:text-gray-100"
                                >
                                    Copy
                                </button>
                                <div className="flex justify-around">
                                    <a href={`https://www.facebook.com/sharer/sharer.php?u=${url}`} target="_blank" rel="noopener noreferrer">
                                        <FaFacebook className="text-blue-600 text-2xl dark:text-blue-400" />
                                    </a>
                                    <a href={`https://twitter.com/share?url=${url}`} target="_blank" rel="noopener noreferrer">
                                        <FaTwitter className="text-blue-400 text-2xl dark:text-blue-300" />
                                    </a>
                                    <a href={`https://www.linkedin.com/shareArticle?mini=true&url=${url}`} target="_blank" rel="noopener noreferrer">
                                        <FaLinkedin className="text-blue-700 text-2xl dark:text-blue-500" />
                                    </a>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SharePopup;
