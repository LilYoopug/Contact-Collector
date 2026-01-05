
import React, { useState, useMemo } from 'react';
import { Contact, Source, ConsentStatus } from '../types';
import { ActivityIcon, UsersIcon, DownloadIcon, DatabaseIcon, CodeIcon } from '../components/icons';

interface OverviewProps {
  contacts: Contact[];
  t: (key: string) => string;
  isAdmin?: boolean;
}

const Overview: React.FC<OverviewProps> = ({ contacts, t, isAdmin }) => {
  const [hoveredTrendIdx, setHoveredTrendIdx] = useState<number | null>(null);
  const [hoveredUserTrendIdx, setHoveredUserTrendIdx] = useState<number | null>(null);
  const [hoveredSource, setHoveredSource] = useState<Source | null>(null);

  // User-specific stats
  const total = contacts.length;
  const newToday = contacts.filter(c => new Date(c.createdAt).toDateString() === new Date().toDateString()).length;
  const optInCount = contacts.filter(c => c.consent === ConsentStatus.OptIn).length;
  const optInRate = total > 0 ? Math.round((optInCount / total) * 100) : 0;

  // Platform-wide simulated events for Admin
  const adminEvents = [
    { id: 1, type: 'signup', user: 'Sarah Jenkins', time: '2m ago', desc: t('userJoined') },
    { id: 2, type: 'alert', user: 'Mike Ross', time: '15m ago', desc: t('apiLimitReached') },
    { id: 3, type: 'signup', user: 'TechFlow Ltd', time: '1h ago', desc: t('userJoined') },
    { id: 4, type: 'alert', user: 'Dev Team', time: '3h ago', desc: 'New API Key generated' },
    { id: 5, type: 'signup', user: 'Budi Santoso', time: '5h ago', desc: t('userJoined') },
  ];

  const sortedContacts = useMemo(() => {
    return [...contacts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [contacts]);

  const sourceCounts = useMemo(() => contacts.reduce((acc, contact) => {
    acc[contact.source] = (acc[contact.source] || 0) + 1;
    return acc;
  }, {} as Record<Source, number>), [contacts]);

  const sourceColors: Record<Source, string> = {
    [Source.OcrList]: '#3b82f6', // primary-500
    [Source.Form]: '#10b981',    // emerald-500
    [Source.Import]: '#f59e0b',  // amber-500
    [Source.Manual]: '#8b5cf6',  // violet-500
  };

  const trendData = useMemo(() => {
    const days = 7;
    const data = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const count = contacts.filter(c => new Date(c.createdAt).toDateString() === date.toDateString()).length;
      data.push({ 
        label: date.toLocaleDateString(undefined, { weekday: 'short' }), 
        fullDate: date.toLocaleDateString(),
        value: isAdmin ? count * 15 + Math.floor(Math.random() * 20) + 50 : count // Scale for admin global feel
      });
    }
    return data;
  }, [contacts, isAdmin]);

  // Admin metric: User growth trend
  const userGrowthData = useMemo(() => {
    // Simulated cumulative growth or daily signups for admin
    return [
      { label: 'Mon', value: 12 },
      { label: 'Tue', value: 15 },
      { label: 'Wed', value: 18 },
      { label: 'Thu', value: 22 },
      { label: 'Fri', value: 28 },
      { label: 'Sat', value: 32 },
      { label: 'Sun', value: 35 },
    ];
  }, []);

  const maxTrendValue = Math.max(...trendData.map(d => d.value), 5);
  const maxUserValue = Math.max(...userGrowthData.map(d => d.value), 5);
  
  const chartWidth = 700;
  const chartHeight = 200;
  const padding = 20;

  const getX = (index: number, totalPoints: number) => (index * (chartWidth - padding * 2)) / (totalPoints - 1) + padding;
  const getY = (value: number, maxValue: number) => chartHeight - ((value / maxValue) * (chartHeight - padding * 2)) - padding;

  const linePath = useMemo(() => {
    return trendData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i, trendData.length)} ${getY(d.value, maxTrendValue)}`).join(' ');
  }, [trendData, maxTrendValue]);

  const areaPath = useMemo(() => {
    return `${linePath} L ${getX(trendData.length - 1, trendData.length)} ${chartHeight} L ${getX(0, trendData.length)} ${chartHeight} Z`;
  }, [linePath]);

  const userLinePath = useMemo(() => {
    return userGrowthData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i, userGrowthData.length)} ${getY(d.value, maxUserValue)}`).join(' ');
  }, [userGrowthData, maxUserValue]);

  const userAreaPath = useMemo(() => {
    return `${userLinePath} L ${getX(userGrowthData.length - 1, userGrowthData.length)} ${chartHeight} L ${getX(0, userGrowthData.length)} ${chartHeight} Z`;
  }, [userLinePath]);

  const StatCard = ({ title, value, icon, trend, trendUp, colorClass = "text-gray-900 dark:text-white" }: { title: string, value: string | number, icon: React.ReactNode, trend?: string, trendUp?: boolean, colorClass?: string }) => (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 transition-all hover:shadow-md">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 rounded-2xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
          {icon}
        </div>
        {trend && (
          <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${trendUp ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : 'text-primary-600 bg-primary-50 dark:bg-primary-900/20'}`}>
            {trend}
          </span>
        )}
      </div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{title}</p>
      <h3 className={`text-3xl font-black mt-1 ${colorClass}`}>{value}</h3>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white">{isAdmin ? t('admin_dashboard') : t('nav_dashboard')}</h2>
          <p className="text-sm text-gray-500">{isAdmin ? t('global_stats') : 'Your personal outreach performance'}</p>
        </div>
        {isAdmin && (
            <div className="px-4 py-1.5 bg-primary-100 dark:bg-primary-900/40 border border-primary-200 dark:border-primary-800 text-primary-600 dark:text-primary-400 text-[10px] font-black uppercase rounded-full tracking-widest shadow-lg shadow-primary-500/10">
                System Administrator
            </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isAdmin ? (
          <>
            <StatCard title={t('totalUsers')} value="35" icon={<UsersIcon className="w-6 h-6" />} trend="+4" trendUp />
            <StatCard title={t('apiTraffic')} value="124.5k" icon={<ActivityIcon className="w-6 h-6" />} trend="High" trendUp />
            <StatCard title={t('successRate')} value="99.9%" icon={<CodeIcon className="w-6 h-6" />} trend="Stable" />
            <StatCard title={t('serverUptime')} value="100%" icon={<DatabaseIcon className="w-6 h-6" />} colorClass="text-green-500" />
          </>
        ) : (
          <>
            <StatCard title={t('totalContacts')} value={total} icon={<UsersIcon className="w-6 h-6" />} trend="+12.5%" trendUp />
            <StatCard title={t('newToday')} value={newToday} icon={<ActivityIcon className="w-6 h-6" />} trend="Live" trendUp />
            <StatCard title={t('conversionRate')} value={`${optInRate}%`} icon={<DownloadIcon className="w-6 h-6" />} trend="Opt-in" />
            <StatCard title={t('requestsLast24h')} value="1,284" icon={<ActivityIcon className="w-6 h-6" />} trend="API" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Growth Trend Chart (Main) */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 p-8 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h4 className="text-xl font-black text-gray-900 dark:text-white">{isAdmin ? 'Platform API Usage' : t('chart_growth_title')}</h4>
              <p className="text-sm text-gray-500">{isAdmin ? 'Total request volume across all nodes' : t('chart_growth_desc')}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary-500"></div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{isAdmin ? 'Traffic' : t('chart_growth_label')}</span>
            </div>
          </div>
          
          <div className="h-64 w-full relative touch-none">
            {hoveredTrendIdx !== null && (
              <div 
                className="absolute z-10 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full mb-4 transition-all duration-150 bg-gray-900"
                style={{ 
                  left: `${(getX(hoveredTrendIdx, trendData.length) / chartWidth) * 100}%`, 
                  top: `${(getY(trendData[hoveredTrendIdx].value, maxTrendValue) / chartHeight) * 100}%` 
                }}
              >
                <p className="text-[10px] opacity-60 mb-1">{trendData[hoveredTrendIdx].fullDate}</p>
                <p className="text-sm">{trendData[hoveredTrendIdx].value} {isAdmin ? 'Requests' : t('contacts')}</p>
                <div className="absolute left-1/2 -bottom-1 w-2 h-2 rotate-45 -translate-x-1/2 bg-gray-900"></div>
              </div>
            )}

            <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
              </defs>

              {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
                const y = getY(maxTrendValue * p, maxTrendValue);
                return (
                  <line key={i} x1={padding} y1={y} x2={chartWidth - padding} y2={y} stroke="currentColor" className="text-gray-100 dark:text-gray-800" strokeWidth="1" strokeDasharray="4 4" />
                );
              })}
              
              <path d={areaPath} fill="url(#areaGradient)" />
              <path d={linePath} fill="none" stroke="url(#lineGradient)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-xl" />

              {hoveredTrendIdx !== null && (
                <line x1={getX(hoveredTrendIdx, trendData.length)} y1={padding} x2={getX(hoveredTrendIdx, trendData.length)} y2={chartHeight - padding} stroke="#3b82f6" strokeWidth="2" strokeDasharray="4" />
              )}

              {trendData.map((d, i) => (
                <circle
                  key={i}
                  cx={getX(i, trendData.length)}
                  cy={getY(d.value, maxTrendValue)}
                  r={hoveredTrendIdx === i ? "8" : "5"}
                  className={`fill-white dark:fill-gray-900 transition-all duration-200 ${hoveredTrendIdx === i ? 'stroke-primary-500 stroke-[4px]' : 'stroke-primary-500 stroke-[3px]'}`}
                  onMouseEnter={() => setHoveredTrendIdx(i)}
                  onMouseLeave={() => setHoveredTrendIdx(null)}
                />
              ))}
            </svg>
            
            <div className="flex justify-between px-2 mt-4">
              {trendData.map((d, i) => (
                <span key={i} className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${hoveredTrendIdx === i ? 'text-primary-600' : 'text-gray-400'}`}>
                  {d.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* User Growth Chart for Admin / Source Dist for User */}
        <div className="lg:col-span-1 bg-white dark:bg-gray-900 p-8 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col">
          {isAdmin ? (
            <>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h4 className="text-xl font-black text-gray-900 dark:text-white">User Growth</h4>
                  <p className="text-sm text-gray-500">Weekly account registration trend</p>
                </div>
              </div>
              
              <div className="h-48 w-full relative touch-none">
                {hoveredUserTrendIdx !== null && (
                  <div 
                    className="absolute z-10 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full mb-4 bg-gray-900"
                    style={{ 
                      left: `${(getX(hoveredUserTrendIdx, userGrowthData.length) / chartWidth) * 100}%`, 
                      top: `${(getY(userGrowthData[hoveredUserTrendIdx].value, maxUserValue) / chartHeight) * 100}%` 
                    }}
                  >
                    <p className="text-sm">{userGrowthData[hoveredUserTrendIdx].value} Users</p>
                    <div className="absolute left-1/2 -bottom-1 w-2 h-2 rotate-45 -translate-x-1/2 bg-gray-900"></div>
                  </div>
                )}

                <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="xMidYMid meet">
                  <path d={userAreaPath} fill="url(#areaGradient)" />
                  <path d={userLinePath} fill="none" stroke="url(#lineGradient)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                  
                  {userGrowthData.map((d, i) => (
                    <circle
                      key={i}
                      cx={getX(i, userGrowthData.length)}
                      cy={getY(d.value, maxUserValue)}
                      r={hoveredUserTrendIdx === i ? "8" : "4"}
                      className="fill-white dark:fill-gray-900 stroke-primary-500 stroke-[3px] transition-all"
                      onMouseEnter={() => setHoveredUserTrendIdx(i)}
                      onMouseLeave={() => setHoveredUserTrendIdx(null)}
                    />
                  ))}
                  {/* Invisible broad hover targets */}
                  {userGrowthData.map((d, i) => (
                    <rect
                      key={`hit-${i}`}
                      x={getX(i, userGrowthData.length) - 20} y="0" width="40" height={chartHeight}
                      fill="transparent"
                      onMouseEnter={() => setHoveredUserTrendIdx(i)}
                      onMouseLeave={() => setHoveredUserTrendIdx(null)}
                      className="cursor-pointer"
                    />
                  ))}
                </svg>
              </div>

              <div className="flex justify-between px-2 mt-4">
                {userGrowthData.map((d, i) => (
                  <span key={i} className={`text-[9px] font-black uppercase tracking-widest text-gray-400`}>
                    {d.label}
                  </span>
                ))}
              </div>

              <div className="mt-auto pt-6 border-t border-gray-50 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Growth Rate</p>
                    <p className="text-lg font-black text-green-600">+191%</p>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-2xl text-green-600">
                    <ActivityIcon className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <h4 className="text-xl font-black text-gray-900 dark:text-white mb-2">{t('stats_source_dist')}</h4>
              <p className="text-sm text-gray-500 mb-8">{t('chart_source_desc')}</p>
              
              <div className="flex-1 flex flex-col items-center justify-center relative">
                <svg className="w-56 h-56 transform -rotate-90 overflow-visible" viewBox="0 0 36 36">
                  {Object.values(Source).map((source, index, arr) => {
                    const count = sourceCounts[source] || 0;
                    const percentage = total > 0 ? (count / total) * 100 : 0;
                    const offset = arr.slice(0, index).reduce((acc, s) => acc + (total > 0 ? ((sourceCounts[s] || 0) / total) * 100 : 0), 0);
                    const isHovered = hoveredSource === source;

                    return (
                      <circle
                        key={source}
                        cx="18" cy="18" r="15.9155"
                        fill="none" 
                        stroke={sourceColors[source]}
                        strokeWidth={isHovered ? "6" : "4.5"}
                        strokeDasharray={`${percentage} ${100 - percentage}`}
                        strokeDashoffset={-offset}
                        style={{ pointerEvents: 'stroke', transition: 'stroke-width 0.3s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.3s' }}
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredSource(source)}
                        onMouseLeave={() => setHoveredSource(null)}
                      />
                    );
                  })}
                </svg>
                
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="text-center animate-in fade-in zoom-in duration-300">
                    {hoveredSource ? (
                      <>
                        <span className="text-3xl font-black text-gray-900 dark:text-white block">
                          {Math.round(((sourceCounts[hoveredSource] || 0) / (total || 1)) * 100)}%
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          {t(`source_${hoveredSource}`)}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-4xl font-black text-gray-900 dark:text-white block">{total}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('contacts')}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-8">
                {Object.values(Source).map(source => (
                  <div key={source} className={`flex items-center gap-2 p-2 rounded-xl transition-all cursor-default ${hoveredSource === source ? 'bg-gray-50 dark:bg-gray-800 shadow-inner' : ''}`}>
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: sourceColors[source] }}></div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[9px] font-bold text-gray-400 uppercase leading-none truncate">{t(`source_${source}`)}</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{sourceCounts[source] || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Bottom Section: Activity / Events */}
        <div className="lg:col-span-3 bg-white dark:bg-gray-900 p-8 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h4 className="text-xl font-black text-gray-900 dark:text-white">{isAdmin ? t('recentPlatformActivity') : t('stats_activity')}</h4>
          </div>
          
          {isAdmin ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {adminEvents.slice(0, 4).map(event => (
                <div key={event.id} className="flex gap-4 group p-4 rounded-[1.5rem] bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                  <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center transition-colors ${event.type === 'signup' ? 'bg-green-100 text-green-600 dark:bg-green-900/30' : 'bg-primary-100 text-primary-600 dark:bg-primary-900/30'}`}>
                    {event.type === 'signup' ? <UsersIcon className="w-5 h-5" /> : <ActivityIcon className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-gray-900 dark:text-white truncate">{event.user}</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase leading-tight mt-0.5">{event.desc}</p>
                    <p className="text-[9px] text-gray-400 mt-1">{event.time}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedContacts.slice(0, 6).map(contact => (
                <div key={contact.id} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all border border-transparent hover:border-gray-100 dark:hover:border-gray-700">
                  <div className="w-12 h-12 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center font-black text-primary-600 dark:text-primary-400 text-lg shadow-inner shrink-0">
                    {contact.fullName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-black text-gray-900 dark:text-white truncate">{contact.fullName}</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight truncate">
                      {t(`source_${contact.source}`)} • <span className="text-gray-400">{contact.company}</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                      {new Date(contact.createdAt).toLocaleDateString([], { day: '2-digit', month: 'short' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Overview;
