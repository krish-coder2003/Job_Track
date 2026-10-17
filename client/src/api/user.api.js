import api from './axios';

/**
 * Fetch authenticated candidate / user profile
 * GET /api/users/me
 */
export const getMyProfileApi = async () => {
  const response = await api.get('/users/me');
  return response.data;
};

/**
 * Update candidate profile details (name, phone, location, skills, experience)
 * PATCH /api/users/me
 *
 * @param {Object} profileData - { name, phone, location, skills, experience }
 */
export const updateMyProfileApi = async (profileData) => {
  const response = await api.patch('/users/me', profileData);
  return response.data;
};

/**
 * Upload or replace a candidate resume (PDF or DOCX)
 * POST /api/users/me/resume
 *
 * @param {File} file - Browser File instance
 */
export const uploadResumeApi = async (file) => {
  const formData = new FormData();
  formData.append('resume', file);

  const response = await api.post('/users/me/resume', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

/**
 * Download or stream candidate's resume
 * GET /api/users/me/resume
 */
export const downloadMyResumeApi = async () => {
  const response = await api.get('/users/me/resume', {
    responseType: 'blob',
  });
  return response.data;
};

export default {
  getMyProfile: getMyProfileApi,
  updateMyProfile: updateMyProfileApi,
  uploadResume: uploadResumeApi,
  downloadMyResume: downloadMyResumeApi,
};
