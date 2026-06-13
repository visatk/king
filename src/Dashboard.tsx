export default function Dashboard({ user }: { user: any }) {
  const closeApp = () => {
    window.Telegram?.WebApp?.close();
  };

  return (
    <div className="min-h-screen p-6 font-sans">
      <div className="max-w-md mx-auto space-y-6">
        
        {/* Header section */}
        <header className="flex items-center justify-between border-b border-gray-700/50 pb-4">
          <h1 className="text-xl font-bold">Dashboard</h1>
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-lg font-bold text-white shadow-lg">
            {user?.firstName?.charAt(0) || 'U'}
          </div>
        </header>

        {/* Main Content */}
        <main className="space-y-4">
          {/* Welcome Card */}
          <div className="bg-gray-800/40 p-5 rounded-2xl border border-gray-700/50 shadow-sm backdrop-blur-sm">
            <h2 className="text-sm opacity-70 mb-1">Welcome back,</h2>
            <p className="text-2xl font-bold">{user?.firstName}</p>
            {user?.username && <p className="text-sm text-blue-400 mt-1">@{user?.username}</p>}
          </div>

          {/* Stats / Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800/40 p-4 rounded-xl border border-gray-700/50">
              <h3 className="text-sm opacity-70 mb-2">Account Status</h3>
              <p className="text-lg font-semibold text-green-400">Active</p>
            </div>
            <div className="bg-gray-800/40 p-4 rounded-xl border border-gray-700/50">
              <h3 className="text-sm opacity-70 mb-2">Joined</h3>
              <p className="text-lg font-semibold">
                {new Date(user?.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          {/* Action Button */}
          <button 
            onClick={closeApp}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition-all shadow-md active:scale-95"
          >
            Done
          </button>
        </main>
      </div>
    </div>
  )
}
