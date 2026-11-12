import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { meetingApi } from '../services/meetingApi';

export default function JoinInvitation() {
  const { invitationId = '' } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState('Validating invitation…');
  useEffect(() => {
    meetingApi.joinByCode(invitationId).then((result) => navigate(`/meeting/${result.meetingId}`, { replace: true }))
      .catch((cause: unknown) => {
        const response = cause as { response?: { data?: { message?: string } } };
        setError(response.response?.data?.message || 'This invitation is invalid or unavailable. Sign in to join.');
      });
  }, [invitationId, navigate]);
  return <main className="min-h-screen grid place-items-center bg-[#F5F3FF] dark:bg-[#0B0B14] p-6"><div className="text-center"><p>{error}</p><button className="mt-4 text-purple-700" onClick={() => navigate('/login')}>Sign in</button></div></main>;
}
