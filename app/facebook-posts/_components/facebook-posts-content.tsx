'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Share2, ThumbsUp, Eye, MessageCircle, Share, RefreshCw, 
  Search, Filter, Calendar, ExternalLink, Sparkles, TrendingUp,
  Clock, Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface FacebookPost {
  id: string;
  postId: string;
  pageId?: string;
  pageName?: string;
  message?: string;
  picture?: string;
  permalinkUrl?: string;
  createdTime?: string;
  likesCount: number;
  viewsCount: number;
  commentsCount: number;
  sharesCount: number;
  syncedAt: string;
}

interface SummaryStats {
  totalPosts: number;
  totalLikes: number;
  totalViews: number;
  totalComments: number;
  totalShares: number;
}

export default function FacebookPostsContent() {
  const [posts, setPosts] = useState<FacebookPost[]>([]);
  const [summary, setSummary] = useState<SummaryStats>({
    totalPosts: 0,
    totalLikes: 0,
    totalViews: 0,
    totalComments: 0,
    totalShares: 0,
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [days, setDays] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (days !== 'all') params.append('days', days);
      if (sortBy) params.append('sortBy', sortBy);

      const res = await fetch(`/api/facebook/posts?${params.toString()}`);
      const data = await res.json();

      if (res.ok && data.success) {
        setPosts(data.posts || []);
        if (data.summary) setSummary(data.summary);
      } else {
        toast.error(data.error || 'Lỗi khi tải danh sách bài viết');
      }
    } catch {
      toast.error('Không thể kết nối đến server');
    } finally {
      setLoading(false);
    }
  }, [search, days, sortBy]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleSync = async () => {
    try {
      setSyncing(true);
      const res = await fetch('/api/facebook/posts', {
        method: 'POST',
      });
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(data.message || 'Đồng bộ bài viết thành công!');
        fetchPosts();
      } else {
        toast.error(data.error || 'Đồng bộ thất bại. Vui lòng kiểm tra lại Token Facebook.');
      }
    } catch {
      toast.error('Lỗi khi gửi yêu cầu đồng bộ');
    } finally {
      setSyncing(false);
    }
  };

  const avgEngagementRate = summary.totalViews > 0
    ? (((summary.totalLikes + summary.totalComments + summary.totalShares) / summary.totalViews) * 100).toFixed(2)
    : '0.00';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <Share2 size={24} />
            </div>
            Bài Đăng Fanpage Facebook
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Tổng hợp và theo dõi số liệu các bài đăng mới nhất (lượt Thích, lượt Xem, Bình luận, Chia sẻ)
          </p>
        </div>

        <button
          onClick={handleSync}
          disabled={syncing}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
        >
          {syncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          {syncing ? 'Đang đồng bộ từ FB...' : 'Đồng bộ bài viết mới'}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <p className="text-xs text-slate-500 font-medium">Tổng số bài viết</p>
          <p className="text-2xl font-bold text-slate-900">{summary.totalPosts}</p>
        </div>
        <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-100 shadow-sm space-y-1">
          <p className="text-xs text-blue-700 font-medium flex items-center gap-1">
            <ThumbsUp size={12} /> Tổng lượt Thích
          </p>
          <p className="text-2xl font-bold text-blue-900">{summary.totalLikes.toLocaleString('vi-VN')}</p>
        </div>
        <div className="bg-purple-50/70 p-4 rounded-2xl border border-purple-100 shadow-sm space-y-1">
          <p className="text-xs text-purple-700 font-medium flex items-center gap-1">
            <Eye size={12} /> Tổng lượt Xem (Reach)
          </p>
          <p className="text-2xl font-bold text-purple-900">{summary.totalViews.toLocaleString('vi-VN')}</p>
        </div>
        <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-100 shadow-sm space-y-1">
          <p className="text-xs text-emerald-700 font-medium flex items-center gap-1">
            <MessageCircle size={12} /> Bình luận & Chia sẻ
          </p>
          <p className="text-2xl font-bold text-emerald-900">
            {(summary.totalComments + summary.totalShares).toLocaleString('vi-VN')}
          </p>
        </div>
        <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-100 shadow-sm space-y-1">
          <p className="text-xs text-amber-700 font-medium flex items-center gap-1">
            <TrendingUp size={12} /> Tỷ lệ tương tác TB
          </p>
          <p className="text-2xl font-bold text-amber-900">{avgEngagementRate}%</p>
        </div>
      </div>

      {/* Toolbar / Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo nội dung bài viết..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          {/* Days filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700">
            <Calendar size={14} className="text-slate-500" />
            <select
              value={days}
              onChange={e => setDays(e.target.value)}
              className="bg-transparent focus:outline-none font-semibold text-slate-800"
            >
              <option value="all">Tất cả thời gian</option>
              <option value="7">7 ngày qua</option>
              <option value="30">30 ngày qua</option>
              <option value="90">90 ngày qua</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700">
            <Filter size={14} className="text-slate-500" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="bg-transparent focus:outline-none font-semibold text-slate-800"
            >
              <option value="newest">Mới nhất</option>
              <option value="likes">Nhiều Like nhất</option>
              <option value="views">Nhiều View nhất</option>
              <option value="comments">Nhiều Comment nhất</option>
              <option value="oldest">Cũ nhất</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content Posts List */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Đang tải danh sách bài viết...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center space-y-4 border border-slate-200 shadow-sm">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
            <Sparkles size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">Chưa có dữ liệu bài viết nào</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Nhấn nút <strong>"Đồng bộ bài viết mới"</strong> ở góc trên để kết nối với Facebook API và cập nhật số liệu mới nhất.
            </p>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <RefreshCw size={14} /> Đồng bộ ngay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {posts.map(post => {
            const postEngagementRate = post.viewsCount > 0
              ? (((post.likesCount + post.commentsCount + post.sharesCount) / post.viewsCount) * 100).toFixed(1)
              : '0.0';

            return (
              <div
                key={post.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  {/* Thumbnail Image if available */}
                  {post.picture ? (
                    <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
                      <img
                        src={post.picture}
                        alt="Post media"
                        className="w-full h-full object-cover"
                        onError={e => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div className="absolute top-3 right-3 bg-slate-900/70 backdrop-blur-md text-white text-[11px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Sparkles size={11} className="text-amber-400" /> ER: {postEngagementRate}%
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                      <span className="text-xs text-slate-400 font-medium">Bài viết chữ (Text Only)</span>
                      <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                        ER: {postEngagementRate}%
                      </span>
                    </div>
                  )}

                  {/* Post Content */}
                  <div className="p-4 space-y-2">
                    <p className="text-xs text-slate-400 font-medium flex items-center gap-1">
                      <Clock size={12} />
                      {post.createdTime ? new Date(post.createdTime).toLocaleString('vi-VN') : 'Mới gần đây'}
                    </p>
                    <p className="text-sm text-slate-800 line-clamp-3 leading-relaxed font-normal">
                      {post.message || <span className="text-slate-400 italic">Không có phần văn bản mô tả</span>}
                    </p>
                  </div>
                </div>

                {/* Footer Metrics & Actions */}
                <div className="p-4 bg-slate-50/60 border-t border-slate-100 space-y-3">
                  <div className="grid grid-cols-4 gap-1 text-center">
                    <div className="bg-white py-1.5 rounded-lg border border-slate-100 shadow-2xs">
                      <p className="text-[10px] text-slate-400 font-medium flex items-center justify-center gap-0.5">
                        <ThumbsUp size={10} className="text-blue-500" /> Like
                      </p>
                      <p className="text-xs font-bold text-slate-900">{post.likesCount}</p>
                    </div>
                    <div className="bg-white py-1.5 rounded-lg border border-slate-100 shadow-2xs">
                      <p className="text-[10px] text-slate-400 font-medium flex items-center justify-center gap-0.5">
                        <Eye size={10} className="text-purple-500" /> View
                      </p>
                      <p className="text-xs font-bold text-slate-900">{post.viewsCount}</p>
                    </div>
                    <div className="bg-white py-1.5 rounded-lg border border-slate-100 shadow-2xs">
                      <p className="text-[10px] text-slate-400 font-medium flex items-center justify-center gap-0.5">
                        <MessageCircle size={10} className="text-emerald-500" /> cmt
                      </p>
                      <p className="text-xs font-bold text-slate-900">{post.commentsCount}</p>
                    </div>
                    <div className="bg-white py-1.5 rounded-lg border border-slate-100 shadow-2xs">
                      <p className="text-[10px] text-slate-400 font-medium flex items-center justify-center gap-0.5">
                        <Share size={10} className="text-amber-500" /> Share
                      </p>
                      <p className="text-xs font-bold text-slate-900">{post.sharesCount}</p>
                    </div>
                  </div>

                  {post.permalinkUrl && (
                    <a
                      href={post.permalinkUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2 rounded-xl bg-white hover:bg-slate-100 text-indigo-600 border border-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                    >
                      Xem trên Facebook <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
