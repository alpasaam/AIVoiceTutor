import { ReactNode } from 'react';
import { Settings, LogOut, BookOpen } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  currentPage: 'whiteboard' | 'settings';
  onNavigate: (page: 'whiteboard' | 'settings') => void;
  onSignOut: () => void;
}

export function Layout({ children, currentPage, onNavigate, onSignOut }: LayoutProps) {
  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-slate-800">AI Voice Tutor</h1>
            </div>

            <nav className="flex items-center space-x-2">
              <button
                onClick={() => onNavigate('whiteboard')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  currentPage === 'whiteboard'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Whiteboard
              </button>
              <button
                onClick={() => onNavigate('settings')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition ${
                  currentPage === 'settings'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </button>
              <button
                onClick={onSignOut}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-slate-600 hover:bg-slate-100 transition ml-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
