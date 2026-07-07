import React, { useState } from 'react';
import Sidebar from './Sidebar';
import CreateStoryModal from './CreateStoryModal';
import '../styles/Layout.css';


const Layout = ({ children }) => {
    const [showCreateStory, setShowCreateStory] = useState(false);

    return (
        <div className="layout">
            <Sidebar onCreateClick={() => setShowCreateStory(true)} />

            <main className="layout-content">
                {children}
            </main>

            {/* The "Create" button in the sidebar can open the story modal from anywhere */}
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