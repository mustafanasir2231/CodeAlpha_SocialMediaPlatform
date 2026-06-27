import React, { useState } from 'react';
import Sidebar from './Sidebar';
import CreateStoryModal from './CreateStoryModal';
import '../styles/Layout.css';

// Layout har page ke around wrap hota hai (App.jsx mein) — sidebar hamesha fixed
// rehta hai, sirf andar ka content (children) badalta hai jab route change ho.
const Layout = ({ children }) => {
    const [showCreateStory, setShowCreateStory] = useState(false);

    return (
        <div className="layout">
            <Sidebar onCreateClick={() => setShowCreateStory(true)} />

            <main className="layout-content">
                {children}
            </main>

            {/* Sidebar ke "Create" button se story modal kahin se bhi khul sake */}
            {showCreateStory && (
                <CreateStoryModal
                    onClose={() => setShowCreateStory(false)}
                    onStoryCreated={() => setShowCreateStory(false)}
                />
            )}
        </div>
    );
};

export default Layout;