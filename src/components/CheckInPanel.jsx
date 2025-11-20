import { useState } from 'react';
import { checkIn } from '../services/api';

export default function CheckInPanel({ onCheckInSuccess }) {
  const [participantId, setParticipantId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await checkIn(participantId, password);
      if (result.success) {
        const name = result.name || '參與者';
        const message = result.alreadyCheckedIn 
          ? `您已經報到過了，歡迎 ${name}` 
          : `報到成功！歡迎 ${name}`;
        setSuccess(message);
        setParticipantId('');
        setPassword('');
        if (onCheckInSuccess) {
          onCheckInSuccess();
        }
      } else {
        setError(result.message || '報到失敗');
      }
    } catch (err) {
      console.error('報到錯誤:', err);
      setError(err.message || '報到時發生錯誤');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
          活動報到
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              員工編號
            </label>
            <input
              type="text"
              value={participantId}
              onChange={(e) => setParticipantId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="請輸入員工編號"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              密碼
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="請輸入密碼"
              required
            />
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '處理中...' : '報到'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>請掃描 QR Code 或直接輸入資訊</p>
        </div>
      </div>
    </div>
  );
}


