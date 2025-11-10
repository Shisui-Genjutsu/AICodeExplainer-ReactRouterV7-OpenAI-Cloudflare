import React from 'react'

const Layout = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className='h-dvh max-w-7xl mx-auto'>
            {children}
        </div>
    )
}

export default Layout