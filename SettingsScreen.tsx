import { useState, useEffect } from 'react';
import { auth } from '../firebase/config';
import { subscribeToUserProfile, updateUserProfile, updateUserLastSeen } from '../firebase/services/users2';
import { Button } from '../components/Button';
import { logoutUser } from '../firebase/services/auth';
import { useNavigate } from 'react-router-dom';

export const SettingsScreen = ({ onLogout }: { onLogout: () => void }) => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const currentUserId = auth.currentUser?.uid;

  useEffect(() => {
    if (!currentUserId) return;

    const unsub = subscribeToUserProfile(currentUserId, (p) => {
      setProfile(p);
      setLoading(false);
    });

    return () => unsub();

    const updateLastSeen = () => {
      if (currentUserId) {
        updateUserLastSeen(currentUserId);
      }
    };

    updateLastSeen();
    const interval = setInterval(updateLastSeen, 60000);
    
    return () => clearInterval(interval);
  }, [currentUserId]);

  const handleToggle = async (field: string) => {
    if (!currentUserId || saving) return;
    
    setSaving(true);
    try {
      await updateUserProfile(currentUserId, {
        [field]: !profile[field]
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleFontSizeChange = async (size: number) => {
    if (!currentUserId || saving) return;
    
    setSaving(true);
    try {
      await updateUserProfile(currentUserId, { fontSize: size });
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      onLogout();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-400">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4 pb-24">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6">Настройки</h1>

        {/* Privacy Settings */}
        <div className="mb-8">
          <h2 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wider">Приватность</h2>
          
          <div className="bg-gray-50 rounded-2xl divide-y divide-gray-100">
            <div className="flex items-center justify-between p-4">
              <span className="font-medium">Показывать дату рождения</span>
              <button
                onClick={() => handleToggle('showBirthDate')}
                disabled={saving}
                className={`w-12 h-7 rounded-full transition-colors ${
                  profile?.showBirthDate ? 'bg-black' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow transition-all ${
                    profile?.showBirthDate ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-4">
              <span className="font-medium">Показывать статус в сети</span>
              <button
                onClick={() => handleToggle('showOnlineStatus')}
                disabled={saving}
                className={`w-12 h-7 rounded-full transition-colors ${
                  profile?.showOnlineStatus ? 'bg-black' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow transition-all ${
                    profile?.showOnlineStatus ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="mb-8">
          <h2 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wider">Внешний вид</h2>
          
          <div className="bg-gray-50 rounded-2xl p-4">
            <p className="font-medium mb-3">Размер шрифта сообщений</p>
            <div className="flex gap-2">
              {[12, 14, 16, 18, 20].map((size) => (
                <button
                  key={size}
                  onClick={() => handleFontSizeChange(size)}
                  disabled={saving}
                  className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                    profile?.fontSize === size ? 'bg-black text-white' : 'bg-white hover:bg-gray-200'
                  }`}
                  style={{ fontSize: `${size}px` }}
                >
                  A
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Account */}
        <div className="mb-8">
          <h2 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wider">Аккаунт</h2>
          
          <div className="bg-gray-50 rounded-2xl divide-y divide-gray-100">
            <div className="p-4">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Email:</span> {auth.currentUser?.email}
              </p>
            </div>
            
            <button
              onClick={handleLogout}
              className="w-full p-4 text-left text-red-600 font-medium hover:bg-red-50 transition-colors rounded-b-2xl"
            >
              Выйти из аккаунта
            </button>
          </div>
        </div>

        {/* About */}
        <div className="text-center text-sm text-gray-400">
          <p>Zero Messenger v1.0.0</p>
          <p className="mt-1">Безопасный и приватный мессенджер</p>
        </div>
      </div>
    </div>
  );
};