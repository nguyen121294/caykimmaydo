'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Camera, Heart, MessageCircle, RefreshCw, 
  Search, Filter, Calendar, ExternalLink, Sparkles, TrendingUp,
  Clock, Loader2, Image as ImageIcon, Video, Layers
} from 'lucide-react';
import { toast } from 'sonner';

interface InstagramPost {
  id: string;
  postId: string;
  igAccountId?: string;
  caption?: string;
  mediaType?: string;
  mediaUrl?: string;
  permalinkUrl?: string;
  createdTime?: string;
  likesCount: number;
  commentsCount: number;
  syncedAt: string;
}

interface SummaryStats {
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
}

export default function InstagramPostsContent() {
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [summary, setSummary] = useState<SummaryStats>({
    totalPosts: 0,
    totalLikes: 0,
    totalComments: 0,
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

      const res = await fetch(`/api/instagram/posts?${params.toString()}`);
      const data = await res.json();

      if (res.ok && data.success) {
        setPosts(data.posts || []);
        if (data.summary) setSummary(data.summary);
      } else {
        toast.error(data.error || 'Lỗi khi tải danh sách bài viết Instagram');
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
      const res = await fetch('/api/instagram/posts', {
        method: 'POST',
      });
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(data.message || 'Đồng bộ bài viết Instagram thành công!');
        fetchPosts();
      } else {
        toast.error(data.error || 'Đồng bộ thất bại. Vui lòng kiểm tra lại Token Instagram.');
      }
    } catch {
      toast.error('Lỗi khi gửi yêu cầu đồng bộ');
    } finally {
      setSyncing(false);
    }
  };

  const totalInteractions = summary.totalLikes + summary.totalComments;
  const avgEngagementRate = summary.totalPosts > 0
    ? (totalInteractions / summary.totalPosts).toFixed(1)
    : '0.0';

  const renderMediaTypeBadge = (type?: string) => {
    if (type === 'VIDEO') {
      return (
        <span className="flex items-center gap-1 bg-purple-100 text-purple-700 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-purple-200">
          <Video size={10} /> Video / Reel
        </span>
      );
    }
    if (type === 'CAROUSEL_ALBUM') {
      return (
        <span className="flex items-center gap-1 bg-pink-100 text-pink-700 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-pink-200">
          <Layers size={10} /> Carousel Album
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-amber-200">
        <ImageIcon size={10} /> Hình Ảnh
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <div className="p-2.5 bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 text-white rounded-2xl shadow-sm">
              <Camera size={24} />
            </div>
            Bài Đăng Instagram Business
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Theo dõi danh sách và số liệu tương tác (Lượt Thích, Lượt Bình Luận) các bài đăng Instagram
          </p>
        </div>

        <button
          onClick={handleSync}
          disabled={syncing}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 active:scale-95 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
        >
          {syncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          {syncing ? 'Đang đồng bộ Instagram...' : 'Đồng bộ bài viết mới'}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <p className="text-xs text-slate-500 font-medium">Tổng số bài viết</p>
          <p className="text-2xl font-bold text-slate-900">{summary.totalPosts}</p>
        </div>
        <div className="bg-pink-50/70 p-4 rounded-2xl border border-pink-100 shadow-sm space-y-1">
          <p className="text-xs text-pink-700 font-medium flex items-center gap-1">
            <Heart size={12} className="fill-pink-500 text-pink-500" /> Tổng lượt Thích
          </p>
          <p className="text-2xl font-bold text-pink-900">{summary.totalLikes.toLocaleString('vi-VN')}</p>
        </div>
        <div className="bg-purple-50/70 p-4 rounded-2xl border border-purple-100 shadow-sm space-y-1">
          <p className="text-xs text-purple-700 font-medium flex items-center gap-1">
            <MessageCircle size={12} /> Tổng lượt Bình luận
          </p>
          <p className="text-2xl font-bold text-purple-900">{summary.totalComments.toLocaleString('vi-VN')}</p>
        </div>
        <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-100 shadow-sm space-y-1">
          <p className="text-xs text-amber-700 font-medium flex items-center gap-1">
            <TrendingUp size={12} /> Tương tác TB / Bài
          </p>
          <p className="text-2xl font-bold text-amber-900">{avgEngagementRate}</p>
        </div>
      </div>

      {/* Toolbar / Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo nội dung Caption..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
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
              <option value="comments">Nhiều Comment nhất</option>
              <option value="oldest">Cũ nhất</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content Posts List */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-pink-600 animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Đang tải bài viết Instagram...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center space-y-4 border border-slate-200 shadow-sm">
          <div className="w-12 h-12 bg-pink-50 text-pink-600 rounded-full flex items-center justify-center mx-auto">
            <Sparkles size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">Chưa có bài viết Instagram nào</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Nhấn nút <strong>"Đồng bộ bài viết mới"</strong> ở góc trên để kết nối với Instagram API và cập nhật danh sách bài đăng.
            </p>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw size={14} /> Đồng bộ ngay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {posts.map(post => {
            const postInteractions = post.likesCount + post.commentsCount;

            return (
              <div
                key={post.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  {/* Media Preview */}
                  {post.mediaUrl ? (
                    <div className="relative h-56 w-full bg-slate-900 overflow-hidden group">
                      <img
                        src={post.mediaUrl}
                        alt="Instagram media"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={e => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div className="absolute top-3 left-3">
                        {renderMediaTypeBadge(post.mediaType)}
                      </div>
                      <div className="absolute top-3 right-3 bg-slate-900/70 backdrop-blur-md text-white text-[11px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Heart size={11} className="text-pink-400 fill-pink-400" /> {postInteractions} tương tác
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                      {renderMediaTypeBadge(post.mediaType)}
                      <span className="text-[11px] font-semibold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full">
                        {postInteractions} tương tác
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
                      {post.caption || <span className="text-slate-400 italic">Không có caption mô tả</span>}
                    </p>
                  </div>
                </div>

                {/* Footer Metrics & Actions */}
                <div className="p-4 bg-slate-50/60 border-t border-slate-100 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-white py-2 rounded-xl border border-slate-100 shadow-2xs flex items-center justify-center gap-1.5">
                      <Heart size={14} className="text-pink-500 fill-pink-500" />
                      <span className="text-xs font-bold text-slate-900">{post.likesCount.toLocaleString('vi-VN')}</span>
                      <span className="text-[10px] text-slate-400">thích</span>
                    </div>
                    <div className="bg-white py-2 rounded-xl border border-slate-100 shadow-2xs flex items-center justify-center gap-1.5">
                      <MessageCircle size={14} className="text-purple-500" />
                      <span className="text-xs font-bold text-slate-900">{post.commentsCount.toLocaleString('vi-VN')}</span>
                      <span className="text-[10px] text-slate-400">bình luận</span>
                    </div>
                  </div>

                  {post.permalinkUrl && (
                    <a
                      href={post.permalinkUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2 rounded-xl bg-gradient-to-r from-pink-50 to-purple-50 hover:from-pink-100 hover:to-purple-100 text-pink-700 border border-pink-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      Xem trên Instagram <ExternalLink size={12} />
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
