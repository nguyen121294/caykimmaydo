'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Camera, Heart, MessageCircle, RefreshCw, 
  Search, Filter, Calendar, ExternalLink, Sparkles, TrendingUp,
  Clock, Loader2, Image as ImageIcon, Video, Layers, Share2
} from 'lucide-react';
import { toast } from 'sonner';

interface InstagramPost {
  id: string;
  adId?: string;
  adName?: string;
  campaignName?: string;
  adSetName?: string;
  postId: string;
  igAccountId?: string;
  caption?: string;
  mediaType?: string;
  mediaUrl?: string;
  permalinkUrl?: string;
  createdTime?: string;
  likesCount: number;
  commentsCount: number;
  sharesCount?: number;
  engagementCount?: number;
  adSpend?: number;
  adReach?: number;
  adVisits?: number;
  adStatus?: string;
  demographics?: any;
  syncedAt: string;
}

interface SummaryStats {
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
}

export default function InstagramPostsContent({ filterType = 'organic' }: { filterType?: 'organic' | 'ads' }) {
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [summary, setSummary] = useState<SummaryStats>({
    totalPosts: 0,
    totalLikes: 0,
    totalComments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(filterType === 'ads' ? 'table' : 'grid');
  const [lastUpdate, setLastUpdate] = useState('');
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set());

  // Filters
  const [search, setSearch] = useState('');
  const [days, setDays] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const filteredPosts = posts.filter(post => {
    if (filterType === 'ads') return true;
    const isAd = Boolean(post.adStatus) || Boolean(post.adSpend && post.adSpend > 0);
    return !isAd; // organic
  });

  const totalPostsCount = filteredPosts.length;
  const totalLikesCount = filteredPosts.reduce((sum, p) => sum + (p.likesCount || 0), 0);
  const totalCommentsCount = filteredPosts.reduce((sum, p) => sum + (p.commentsCount || 0), 0);
  const totalInteractions = totalLikesCount + totalCommentsCount;
  const totalAdSpend = filteredPosts.reduce((sum, post) => sum + (post.adSpend || 0), 0);
  const totalAdReach = filteredPosts.reduce((sum, post) => sum + (post.adReach || 0), 0);
  const totalAdVisits = filteredPosts.reduce((sum, post) => sum + (post.adVisits || 0), 0);
  const avgEngagementRate = totalPostsCount > 0
    ? (totalInteractions / totalPostsCount).toFixed(1)
    : '0.0';

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (days !== 'all') params.append('days', days);
      if (sortBy) params.append('sortBy', sortBy);

      const endpoint = filterType === 'ads' ? '/api/instagram/ads' : '/api/instagram/posts';
      const res = await fetch(`${endpoint}?${params.toString()}`);
      const data = await res.json();

      if (res.ok && data.success) {
        setPosts(data.posts || []);
        if (data.summary) setSummary(data.summary);
        setLastUpdate(new Date().toLocaleTimeString('vi-VN'));
      } else {
        toast.error(data.error || 'Lỗi khi tải danh sách bài viết Instagram');
      }
    } catch {
      toast.error('Không thể kết nối đến server');
    } finally {
      setLoading(false);
    }
  }, [search, days, sortBy, filterType]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

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
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <div className="p-2.5 bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 text-white rounded-2xl shadow-sm">
              <Camera size={24} />
            </div>
            {filterType === 'ads' ? 'Quảng Cáo Instagram' : 'Bài Đăng Instagram (Tự Nhiên)'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {filterType === 'ads'
              ? 'Theo dõi hiệu suất và chi phí của các bài viết được chạy quảng cáo'
              : 'Theo dõi danh sách và số liệu tương tác các bài đăng tự nhiên'}
          </p>
        </div>

        <div className="flex flex-col items-center justify-start">
          <Link
            href="/sync-hub"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl shadow-sm transition-all whitespace-nowrap min-w-[130px]"
          >
            <RefreshCw size={14} />
            Đến Sync Hub
          </Link>
          {lastUpdate && (
            <span className="text-[10px] text-slate-400 mt-1 text-center tracking-tight block">
              Cập nhật: {lastUpdate}
            </span>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <p className="text-xs text-slate-500 font-medium">{filterType === 'ads' ? 'Tổng số quảng cáo' : 'Tổng số bài viết'}</p>
          <p className="text-2xl font-bold text-slate-900">{totalPostsCount}</p>
        </div>
        <div className="bg-pink-50/70 p-4 rounded-2xl border border-pink-100 shadow-sm space-y-1">
          <p className="text-xs text-pink-700 font-medium flex items-center gap-1">
            <Heart size={12} className="fill-pink-500 text-pink-500" /> {filterType === 'ads' ? 'Tổng chi tiêu' : 'Tổng lượt Thích'}
          </p>
          <p className="text-2xl font-bold text-pink-900">
            {filterType === 'ads' ? `${totalAdSpend.toLocaleString('vi-VN')} đ` : totalLikesCount.toLocaleString('vi-VN')}
          </p>
        </div>
        <div className="bg-purple-50/70 p-4 rounded-2xl border border-purple-100 shadow-sm space-y-1">
          <p className="text-xs text-purple-700 font-medium flex items-center gap-1">
            <MessageCircle size={12} /> {filterType === 'ads' ? 'Tổng tiếp cận' : 'Tổng lượt Bình luận'}
          </p>
          <p className="text-2xl font-bold text-purple-900">
            {filterType === 'ads' ? totalAdReach.toLocaleString('vi-VN') : totalCommentsCount.toLocaleString('vi-VN')}
          </p>
        </div>
        <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-100 shadow-sm space-y-1">
          <p className="text-xs text-amber-700 font-medium flex items-center gap-1">
            <TrendingUp size={12} /> {filterType === 'ads' ? 'Tổng truy cập' : 'Tương tác TB / Bài'}
          </p>
          <p className="text-2xl font-bold text-amber-900">
            {filterType === 'ads' ? totalAdVisits.toLocaleString('vi-VN') : avgEngagementRate}
          </p>
        </div>
      </div>

      {/* Toolbar / Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={filterType === 'ads' ? 'Tìm theo tên Ads, Campaign...' : 'Tìm theo nội dung Caption...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          {/* View Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                viewMode === 'grid' ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Dạng Lưới
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                viewMode === 'table' ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Dạng Bảng (Ads)
            </button>
          </div>
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
              {filterType === 'ads' ? (
                <>
                  <option value="spend">Chi tiêu cao nhất</option>
                  <option value="reach">Tiếp cận cao nhất</option>
                  <option value="visits">Truy cập cao nhất</option>
                </>
              ) : (
                <>
                  <option value="likes">Nhiều Like nhất</option>
                  <option value="comments">Nhiều Comment nhất</option>
                </>
              )}
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
      ) : filteredPosts.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center space-y-4 border border-slate-200 shadow-sm">
          <div className="w-12 h-12 bg-pink-50 text-pink-600 rounded-full flex items-center justify-center mx-auto">
            <Sparkles size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">Chưa có bài viết Instagram nào</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Đến Sync Hub để kết nối Instagram API và cập nhật danh sách bài đăng.
            </p>
          </div>
          <Link
            href="/sync-hub"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw size={14} /> Đến Sync Hub
          </Link>
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 font-semibold uppercase">
              <tr>
                <th className="px-4 py-3">Bài viết</th>
                <th className="px-4 py-3 text-center">Truy cập trang</th>
                <th className="px-4 py-3 text-center">Chi phí / Truy cập</th>
                <th className="px-4 py-3">Chi tiết quảng cáo</th>
                <th className="px-4 py-3">Nhân khẩu học</th>
                <th className="px-4 py-3 text-center">Tương tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPosts.map((post, idx) => {
                const postInteractions = post.engagementCount || post.likesCount + post.commentsCount + (post.sharesCount || 0);

                // Real Ads Data
                const adVisits = post.adVisits || 0;
                const adSpend = post.adSpend || 0;
                const costPerVisit = adVisits > 0 ? Math.floor(adSpend / adVisits) : 0;
                const adReach = post.adReach || 0;
                const adStatus = post.adStatus || 'Không chạy Ads';
                
                // Real Demographics
                let femalePercent: number | null = null;
                let regions: Array<{ name: string; reach: number; percent: number }> = [];
                let ageGroups: Array<{ name: string; reach: number; percent: number }> = [];
                let demographicsAvailable = false;

                if (post.demographics) {
                  try {
                    const demo = typeof post.demographics === 'string' ? JSON.parse(post.demographics) : post.demographics;
                    demographicsAvailable = demo.available === true;
                    if (demographicsAvailable) {
                      femalePercent = typeof demo.femalePercent === 'number' ? demo.femalePercent : null;
                      regions = Array.isArray(demo.regions) ? demo.regions : [];
                      ageGroups = Array.isArray(demo.ageGroups) ? demo.ageGroups : [];
                    }
                  } catch (e) {}
                }
                const regionsExpanded = expandedRegions.has(post.id);
                const visibleRegions = regionsExpanded ? regions : regions.slice(0, 5);
                
                return (
                  <tr key={post.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 min-w-[200px]">
                      <div className="flex gap-3 items-start">
                        {post.mediaUrl ? (
                          <img src={post.mediaUrl} alt="" className="w-16 h-16 object-cover rounded-lg flex-shrink-0" />
                        ) : (
                          <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center text-xs text-slate-400">Media</div>
                        )}
                        <div>
                          <p className="font-medium text-slate-900 line-clamp-2 text-xs">{post.adName || post.caption || 'Không có mô tả'}</p>
                          {post.adId && <p className="text-[10px] text-slate-400 mt-1">Ad ID: {post.adId}</p>}
                          {post.campaignName && <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">Campaign: {post.campaignName}</p>}
                          <p className="text-[10px] text-slate-500 mt-1 flex items-center flex-wrap gap-1">
                            <Clock size={10} /> {post.createdTime ? new Date(post.createdTime).toLocaleDateString('vi-VN') : 'Mới đây'}
                            {adSpend > 0 && <span className={`ml-1 px-1.5 py-0.5 font-bold rounded-[4px] text-[9px] border uppercase tracking-wider ${adStatus === 'Đang chạy' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>{adStatus}</span>}
                          </p>
                          {post.permalinkUrl && (
                            <a href={post.permalinkUrl} target="_blank" rel="noreferrer" className="text-[10px] text-pink-600 font-medium hover:underline flex items-center gap-0.5 mt-1">
                              Xem post <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <p className="font-bold text-slate-900 text-lg">{adVisits.toLocaleString('vi-VN')}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <p className="font-semibold text-slate-700">{costPerVisit.toLocaleString('vi-VN')} đ</p>
                    </td>
                    <td className="px-4 py-3 min-w-[250px] text-xs space-y-1.5 text-slate-600">
                      <div className="flex justify-between"><span>Vị trí:</span> <span className="font-medium text-slate-900">Instagram</span></div>
                      <div className="flex justify-between">
                        <span>Trạng thái:</span> 
                        <span className={`font-medium ${adStatus === 'Đang chạy' ? 'text-emerald-600' : 'text-slate-600'}`}>
                          {adStatus}
                        </span>
                      </div>
                      <div className="flex justify-between"><span>Chi tiêu:</span> <span className="font-medium text-slate-900">{adSpend.toLocaleString('vi-VN')} đ</span></div>
                      <div className="flex justify-between"><span>Lượt tiếp cận:</span> <span className="font-medium text-slate-900">{adReach.toLocaleString('vi-VN')}</span></div>
                      <div className="flex justify-between pt-1 mt-1 border-t border-slate-100">
                        <span className="shrink-0 mr-2">Đối tượng:</span> 
                        <span className="font-medium text-slate-900 text-right line-clamp-2" title="Đối tượng từ Meta Insights">
                          {demographicsAvailable ? 'Dữ liệu từ Meta Insights' : 'Chưa có dữ liệu từ Meta'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 min-w-[200px] text-xs text-slate-600">
                      <div className="space-y-2">
                        {visibleRegions.map((region) => (
                          <div key={region.name}>
                            <div className="flex justify-between gap-2 text-[10px] mb-0.5 font-medium">
                              <span className="truncate" title={region.name}>📍 {region.name}</span>
                              <span>{region.percent}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5">
                              <div className="bg-pink-500 h-1.5 rounded-full" style={{ width: `${region.percent}%` }} />
                            </div>
                          </div>
                        ))}
                        {regions.length > 5 && (
                          <button
                            type="button"
                            onClick={() => setExpandedRegions((current) => {
                              const next = new Set(current);
                              if (next.has(post.id)) next.delete(post.id); else next.add(post.id);
                              return next;
                            })}
                            className="text-[10px] font-semibold text-pink-600 hover:text-pink-700"
                          >
                            {regionsExpanded ? 'Thu gọn' : `Xem tất cả (${regions.length})`}
                          </button>
                        )}
                        <div className="pt-1.5 mt-1.5 border-t border-slate-100 space-y-1">
                           <div className="flex justify-between text-[10px]"><span>👩 Giới tính Nữ</span> <span className="font-semibold">{femalePercent === null ? '—' : `${femalePercent}%`}</span></div>
                           {ageGroups.map((group) => (
                             <div key={group.name} className="flex justify-between text-[10px]">
                               <span>🧑 Tuổi {group.name}</span>
                               <span className="font-semibold">{group.percent}%</span>
                             </div>
                           ))}
                           {!demographicsAvailable && <p className="pt-1 text-[10px] text-slate-400">Meta không cung cấp dữ liệu</p>}
                           {demographicsAvailable && regions.length === 0 && ageGroups.length === 0 && <p className="pt-1 text-[10px] text-slate-400">Đồng bộ lại để lấy dữ liệu động</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1.5 min-w-[120px]">
                        <div className="flex justify-between items-center text-xs bg-slate-100 px-2 py-1 rounded">
                          <span className="flex items-center gap-1 text-slate-500"><Heart size={10} className="text-pink-500 fill-pink-500"/> Like</span>
                          <span className="font-semibold text-slate-900">{post.likesCount}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs bg-slate-100 px-2 py-1 rounded">
                          <span className="flex items-center gap-1 text-slate-500"><MessageCircle size={10} className="text-purple-500"/> Cmt</span>
                          <span className="font-semibold text-slate-900">{post.commentsCount}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs bg-slate-100 px-2 py-1 rounded">
                          <span className="flex items-center gap-1 text-slate-500"><Share2 size={10} className="text-blue-500"/> Share</span>
                          <span className="font-semibold text-slate-900">{post.sharesCount || 0}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs bg-slate-100 px-2 py-1 rounded">
                          <span className="flex items-center gap-1 text-slate-500"><TrendingUp size={10} className="text-amber-500"/> Total</span>
                          <span className="font-semibold text-slate-900">{postInteractions}</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPosts.map(post => {
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
