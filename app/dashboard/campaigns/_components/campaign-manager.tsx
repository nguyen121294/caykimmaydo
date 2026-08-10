'use client';

import React, { useEffect, useState } from 'react';
import { Search, ChevronDown, ChevronUp, RefreshCw, Calendar } from 'lucide-react';
import PageHeader from '@/app/components/page-header';

interface CampaignManagerProps {
  timeRange?: string;
  refreshKey?: number;
}

export default function CampaignManager({ timeRange = '30', refreshKey = 0 }: CampaignManagerProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/campaigns?days=${timeRange}&_t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Campaign request failed: ${res.status}`);
      const json = await res.json();
      setData(json?.campaignRecords ?? []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeRange, refreshKey]);

  const filteredData = data.filter(record => 
    record.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleRow = (name: string) => {
    setExpandedRow(prev => prev === name ? null : name);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader title="Quản Lý Chiến Dịch" description="Phân tích hiệu suất theo chiến dịch và chi tiết từng ngày" />
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Tìm tên chiến dịch..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none w-full sm:w-64"
            />
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-sm font-medium text-gray-700 rounded-lg shadow-sm hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col flex-1">
        <div className="overflow-auto flex-1 custom-scrollbar">
          <table className="w-full text-left text-sm text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0 z-10 whitespace-nowrap shadow-sm">
              <tr>
                <th className="px-4 py-3 rounded-tl-lg w-10"></th>
                <th className="px-4 py-3">Tên Chiến Dịch</th>
                <th className="px-4 py-3">CPM</th>
                <th className="px-4 py-3">Click liên kết</th>
                <th className="px-4 py-3">CPC (liên kết)</th>
                <th className="px-4 py-3">%CTR (liên kết)</th>
                <th className="px-4 py-3">Click (tất cả)</th>
                <th className="px-4 py-3">CPC (tất cả)</th>
                <th className="px-4 py-3">%CTR (tất cả)</th>
                <th className="px-4 py-3">Xem trang đích</th>
                <th className="px-4 py-3">Chi Phí</th>
                <th className="px-4 py-3">Doanh Thu</th>
                <th className="px-4 py-3">CPA</th>
                <th className="px-4 py-3 rounded-tr-lg">Chuyển Đổi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && data.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-4 py-8 text-center text-gray-400">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : filteredData.length > 0 ? (
                filteredData.map((record: any, idx: number) => {
                  const isExpanded = expandedRow === record.name;
                  return (
                    <React.Fragment key={idx}>
                      <tr 
                        onClick={() => toggleRow(record.name)}
                        className={`hover:bg-blue-50/30 transition-colors cursor-pointer ${isExpanded ? 'bg-blue-50/20' : ''}`}
                      >
                        <td className="px-4 py-3 text-gray-400">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900 min-w-[200px] break-words" title={record.name}>
                          {record.name}
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {record.cpm > 0 ? `${record.cpm.toLocaleString('vi-VN')} đ` : '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-700 font-medium">
                          {record.linkClicks.toLocaleString('vi-VN')}
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {record.cpcLink > 0 ? `${record.cpcLink.toLocaleString('vi-VN')} đ` : '-'}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${record.ctrLink >= 1 ? 'bg-emerald-100 text-emerald-700' : record.ctrLink > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                            {record.ctrLink > 0 ? `${record.ctrLink}%` : 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {record.clicks.toLocaleString('vi-VN')}
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {record.cpc > 0 ? `${record.cpc.toLocaleString('vi-VN')} đ` : '-'}
                        </td>
                        <td className="px-4 py-3">
                          {record.ctr > 0 ? `${record.ctr}%` : '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-700 font-medium">
                          {record.landingPageViews.toLocaleString('vi-VN')}
                        </td>
                        <td className="px-4 py-3 text-red-600 font-medium whitespace-nowrap">
                          {record.spend > 0 ? `${record.spend.toLocaleString('vi-VN')} đ` : '-'}
                        </td>
                        <td className="px-4 py-3 text-emerald-600 font-medium whitespace-nowrap">
                          {record.revenue > 0 ? `${record.revenue.toLocaleString('vi-VN')} đ` : '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-700 font-medium whitespace-nowrap">
                          {record.cpa > 0 ? `${record.cpa.toLocaleString('vi-VN')} đ` : '-'}
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-700">
                          {record.conversions}
                        </td>
                      </tr>
                      {/* Accordion Content */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={14} className="p-0 bg-gray-50 border-b-2 border-gray-200 shadow-inner">
                            <div className="p-4 max-h-[400px] overflow-auto">
                              <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 px-2">Chi tiết từng ngày</h4>
                              <table className="w-full text-left text-sm text-gray-500 bg-white border border-gray-200 rounded-lg overflow-hidden">
                                <thead className="bg-gray-100 text-xs uppercase sticky top-0">
                                  <tr>
                                    <th className="px-4 py-2">Ngày</th>
                                    <th className="px-4 py-2">CPM</th>
                                    <th className="px-4 py-2">Click liên kết</th>
                                    <th className="px-4 py-2">CPC (LK)</th>
                                    <th className="px-4 py-2">%CTR (LK)</th>
                                    <th className="px-4 py-2">Click (ALL)</th>
                                    <th className="px-4 py-2">CPC (ALL)</th>
                                    <th className="px-4 py-2">%CTR (ALL)</th>
                                    <th className="px-4 py-2">View Đích</th>
                                    <th className="px-4 py-2">Chi Phí</th>
                                    <th className="px-4 py-2">Doanh Thu</th>
                                    <th className="px-4 py-2">CPA</th>
                                    <th className="px-4 py-2">Chuyển Đổi</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {record.dailyRecords?.map((dr: any, dIdx: number) => (
                                    <tr key={dIdx} className="hover:bg-gray-50">
                                      <td className="px-4 py-2 font-medium text-gray-900 whitespace-nowrap">{formatDate(dr.date)}</td>
                                      <td className="px-4 py-2 text-gray-600 whitespace-nowrap">{dr.cpm > 0 ? `${dr.cpm.toLocaleString('vi-VN')} đ` : '-'}</td>
                                      <td className="px-4 py-2">{dr.linkClicks.toLocaleString('vi-VN')}</td>
                                      <td className="px-4 py-2 whitespace-nowrap">{dr.cpcLink > 0 ? `${dr.cpcLink.toLocaleString('vi-VN')} đ` : '-'}</td>
                                      <td className="px-4 py-2"><span className="text-xs font-semibold">{dr.ctrLink > 0 ? `${dr.ctrLink}%` : '-'}</span></td>
                                      <td className="px-4 py-2">{dr.clicks.toLocaleString('vi-VN')}</td>
                                      <td className="px-4 py-2 whitespace-nowrap">{dr.cpc > 0 ? `${dr.cpc.toLocaleString('vi-VN')} đ` : '-'}</td>
                                      <td className="px-4 py-2">{dr.ctr > 0 ? `${dr.ctr}%` : '-'}</td>
                                      <td className="px-4 py-2">{dr.landingPageViews.toLocaleString('vi-VN')}</td>
                                      <td className="px-4 py-2 text-red-600 font-medium whitespace-nowrap">{dr.spend > 0 ? `${dr.spend.toLocaleString('vi-VN')} đ` : '-'}</td>
                                      <td className="px-4 py-2 text-emerald-600 font-medium whitespace-nowrap">{dr.revenue > 0 ? `${dr.revenue.toLocaleString('vi-VN')} đ` : '-'}</td>
                                      <td className="px-4 py-2 text-gray-700 whitespace-nowrap">{dr.cpa > 0 ? `${dr.cpa.toLocaleString('vi-VN')} đ` : '-'}</td>
                                      <td className="px-4 py-2 font-semibold text-gray-700">{dr.conversions}</td>
                                    </tr>
                                  ))}
                                  {(!record.dailyRecords || record.dailyRecords.length === 0) && (
                                    <tr><td colSpan={13} className="px-4 py-4 text-center text-gray-400">Không có dữ liệu ngày</td></tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={14} className="px-4 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="w-8 h-8 text-gray-300" />
                      <p>Không tìm thấy chiến dịch nào.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
