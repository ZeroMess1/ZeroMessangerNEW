import { useState, useEffect } from 'react';
import { auth } from '../firebase/config';
import { subscribeToUserProfile, updateUserProfile, updateUserLastSeen } from '../firebase/services/users2';
import { AvatarPicker } from '../components/AvatarPicker';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

export const ProfileScreen = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    about: '',
    birthDate: ''
  });
  const [avatar, setAvatar] = useState('');
  const currentUserId = auth.currentUser?.uid;

  useEffect(() => {
    if (!currentUserId) return;

    const unsub = subscribeToUserProfile(currentUserId, (p) => {
      setProfile(p);
      setFormData({
        name: p?.name || '',
        about: p?.about || '',
        birthDate: p?.birthDate || ''
      });
      setAvatar(p?.avatarUrl || '');
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

  const handleSave = async () => {
    if (!currentUserId || saving) return;
    
    setSaving(true);
    try {
      await updateUserProfile(currentUserId, {
        name: formData.name,
        about: formData.about,
        birthDate: formData.birthDate,
        avatarUrl: avatar
      });
      setEditMode(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
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
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Профиль</h1>
          {!editMode && (
            <Button onClick={() => setEditMode(true)} variant="secondary">
              Изменить
            </Button>
          )}
        </div>

        {/* Avatar Section */}
        <div className="flex flex-col items-center mb-8">
          {editMode ? (
            <AvatarPicker onSelect={setAvatar} selected={avatar} />
          ) : (
            <div className="w-20 h-20 rounded-full bg-black text-white flex items-center justify-center text-3xl font-medium">
              {avatar || profile?.name?.[0]?.toUpperCase() || '?'}
            </div>
          )}
          
          <h2 className="text-xl font-semibold mt-4">{formData.name}</h2>
          <p className="text-gray-500">ID: {profile?.uniqueId}</p>
        </div>

        {/* Email (read-only) */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
          <div className="px-4 py-3 rounded-xl bg-gray-50 text-gray-600">
            {auth.currentUser?.email}
          </div>
        </div>

        {/* Form Fields */}
        {editMode ? (
          <div className="space-y-4">
            <Input
              label="Имя"
              placeholder="Ваше имя"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Обо мне</label>
              <textarea
                placeholder="Расскажите о себе"
                value={formData.about}
                onChange={(e) => setFormData({ ...formData, about: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-2 focus:ring-black/10 outline-none transition-all resize-none h-24"
              />
            </div>

            <Input
              label="Дата рождения"
              type="date"
              value={formData.birthDate}
              onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
            />

            <div className="flex gap-2">
              <Button onClick={() => setEditMode(false)} variant="secondary" className="flex-1">
                Отмена
              </Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Обо мне</label>
              <div className="px-4 py-3 rounded-xl bg-gray-50 text-gray-600 min-h-16">
                {formData.about || 'Не указано'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Дата рождения</label>
              <div className="px-4 py-3 rounded-xl bg-gray-50 text-gray-600">
                {formData.birthDate ? new Date(formData.birthDate).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                }) : 'Не указана'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};