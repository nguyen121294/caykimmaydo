'use client';

import { useState } from 'react';
import { Share2, Camera, Megaphone } from 'lucide-react';
import FacebookPostsContent from './_components/facebook-posts-content';
import InstagramPostsContent from './_components/instagram-posts-content';

export default function PostsPage() {
  const [activeTab, setActiveTab] = useState<'facebook' | 'instagram_organic' | 'instagram_ads'>('facebook');

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Tabs */}
      <div className="flex space-x-1 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('facebook')}
          className={`flex items-center gap-2 py-3 px-6 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'facebook'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Share2 size={16} />
          Bài Đăng Facebook
        </button>
        <button
          onClick={() => setActiveTab('instagram_organic')}
          className={`flex items-center gap-2 py-3 px-6 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'instagram_organic'
              ? 'border-pink-600 text-pink-600 bg-pink-50/50'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Camera size={16} />
          Instagram (Tự Nhiên)
        </button>
        <button
          onClick={() => setActiveTab('instagram_ads')}
          className={`flex items-center gap-2 py-3 px-6 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'instagram_ads'
              ? 'border-pink-600 text-pink-600 bg-pink-50/50'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Megaphone size={16} />
          Instagram (Quảng Cáo)
        </button>
      </div>

      {/* Content */}
      <div className="mt-4">
        {activeTab === 'facebook' && <FacebookPostsContent />}
        {activeTab === 'instagram_organic' && <InstagramPostsContent filterType="organic" />}
        {activeTab === 'instagram_ads' && <InstagramPostsContent filterType="ads" />}
      </div>
    </div>
  );
}
