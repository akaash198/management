"use client";

import React, { useState } from 'react';
import { useRetrospectives } from '@/hooks/useRetrospectives';
import { Retrospective, RetroItem } from '@/types/task';
import { 
  Plus, 
  MessageSquare, 
  ThumbsUp, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  HelpCircle,
  Calendar,
  ChevronRight,
  PlusCircle
} from 'lucide-react';
import { format } from 'date-fns';

interface RetrospectiveViewProps {
  teamId: string;
}

export const RetrospectiveView: React.FC<RetrospectiveViewProps> = ({ teamId }) => {
  const { retrospectives, loading, createRetrospective, addRetroItem, voteRetroItem } = useRetrospectives(teamId);
  const [activeRetroId, setActiveRetroId] = useState<string | null>(null);
  const [newItemText, setNewItemText] = useState("");
  const [newItemType, setNewItemType] = useState<RetroItem['item_type']>("keep");

  const activeRetro = retrospectives.find(r => r.id === activeRetroId);

  const handleCreateRetro = async () => {
    const title = prompt("Enter retrospective title (e.g. Sprint 12 Retro):");
    if (title) {
      const newRetro = await createRetrospective({
        team: teamId,
        title,
        date: new Date().toISOString().split('T')[0]
      });
      if (newRetro) setActiveRetroId(newRetro.id);
    }
  };

  const handleAddItem = async () => {
    if (!activeRetroId || !newItemText.trim()) return;
    await addRetroItem({
      retrospective: activeRetroId,
      item_type: newItemType,
      text: newItemText
    });
    setNewItemText("");
  };

  if (loading && retrospectives.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#f9fafb] rounded-xl overflow-hidden border border-gray-200 shadow-sm">
      <div className="flex h-full">
        {/* Sidebar */}
        <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <h3 className="font-semibold text-gray-900">Retrospectives</h3>
            <button 
              onClick={handleCreateRetro}
              className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Plus size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {retrospectives.map(retro => (
              <button
                key={retro.id}
                onClick={() => setActiveRetroId(retro.id)}
                className={`w-full text-left p-3 rounded-xl transition-all duration-200 border ${
                  activeRetroId === retro.id 
                    ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
                    : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-100'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`font-medium ${activeRetroId === retro.id ? 'text-indigo-900' : 'text-gray-900'}`}>
                    {retro.title}
                  </span>
                </div>
                <div className="flex items-center text-xs text-gray-500">
                  <Calendar size={12} className="mr-1" />
                  {format(new Date(retro.date), 'MMM d, yyyy')}
                  <span className="mx-2">•</span>
                  <MessageSquare size={12} className="mr-1" />
                  {retro.items?.length || 0} items
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main Area */}
        <div className="flex-1 flex flex-col bg-[#f3f4f6]">
          {activeRetro ? (
            <>
              <div className="p-6 bg-white border-b border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{activeRetro.title}</h2>
                    <p className="text-sm text-gray-500">Reflection and improvement session for the team.</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">In Session</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-3 gap-6">
                  {/* Keep Column */}
                  <RetroColumn 
                    title="What went well?" 
                    type="keep" 
                    icon={<TrendingUp className="text-emerald-500" />}
                    items={activeRetro.items?.filter(i => i.item_type === 'keep') || []}
                    onVote={voteRetroItem}
                  />

                  {/* Improve Column */}
                  <RetroColumn 
                    title="What can we improve?" 
                    type="improve" 
                    icon={<TrendingDown className="text-rose-500" />}
                    items={activeRetro.items?.filter(i => i.item_type === 'improve') || []}
                    onVote={voteRetroItem}
                  />

                  {/* Discussion Column */}
                  <RetroColumn 
                    title="Points for discussion" 
                    type="discussion" 
                    icon={<HelpCircle className="text-amber-500" />}
                    items={activeRetro.items?.filter(i => i.item_type === 'discussion') || []}
                    onVote={voteRetroItem}
                  />
                </div>
              </div>

              {/* Input Area */}
              <div className="p-6 bg-white border-t border-gray-200 shadow-lg">
                <div className="max-w-3xl mx-auto flex space-x-4">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={newItemText}
                      onChange={(e) => setNewItemText(e.target.value)}
                      placeholder={`Add something to ${newItemType}...`}
                      className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                    />
                    <button 
                      onClick={handleAddItem}
                      className="absolute right-2 top-1.5 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                      <PlusCircle size={20} />
                    </button>
                  </div>
                  <div className="flex p-1 bg-gray-100 rounded-xl border border-gray-200">
                    <TypeButton active={newItemType === 'keep'} onClick={() => setNewItemType('keep')} label="Keep" color="emerald" />
                    <TypeButton active={newItemType === 'improve'} onClick={() => setNewItemType('improve')} label="Improve" color="rose" />
                    <TypeButton active={newItemType === 'discussion'} onClick={() => setNewItemType('discussion')} label="Discuss" color="amber" />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 opacity-60">
              <div className="p-8 bg-white rounded-full shadow-inner mb-6">
                <MessageSquare size={64} className="text-gray-300" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No active session</h3>
              <p>Select a retrospective from the sidebar or start a new one.</p>
              <button 
                onClick={handleCreateRetro}
                className="mt-6 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all shadow-md active:scale-95"
              >
                Start New Session
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const RetroColumn: React.FC<{
  title: string;
  type: string;
  icon: React.ReactNode;
  items: RetroItem[];
  onVote: (id: string) => void;
}> = ({ title, icon, items, onVote }) => (
  <div className="flex flex-col h-full min-h-[400px]">
    <div className="flex items-center space-x-2 mb-4">
      <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100">{icon}</div>
      <h4 className="font-bold text-gray-800 tracking-tight">{title}</h4>
      <span className="ml-auto text-xs font-bold bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{items.length}</span>
    </div>
    <div className="space-y-3 flex-1 overflow-y-auto">
      {items.map(item => (
        <div 
          key={item.id} 
          className="group bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200 animate-in fade-in slide-in-from-bottom-2"
        >
          <p className="text-gray-700 leading-relaxed mb-4">{item.text}</p>
          <div className="flex items-center justify-between border-t border-gray-50 pt-3 mt-auto">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700 border border-white">
                {item.submitter?.full_name?.charAt(0) || '?'}
              </div>
              <span className="text-xs text-gray-500 font-medium">{item.submitter?.full_name || 'Team member'}</span>
            </div>
            <button
              onClick={() => onVote(item.id)}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                item.has_voted 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-100'
              }`}
            >
              <ThumbsUp size={14} className={item.has_voted ? 'fill-current' : ''} />
              <span>{item.vote_count}</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const TypeButton: React.FC<{ active: boolean, onClick: () => void, label: string, color: 'emerald' | 'rose' | 'amber' }> = ({ active, onClick, label, color }) => {
  const colors = {
    emerald: active ? 'bg-emerald-600 text-white shadow-md' : 'text-emerald-700 hover:bg-emerald-50',
    rose: active ? 'bg-rose-600 text-white shadow-md' : 'text-rose-700 hover:bg-rose-50',
    amber: active ? 'bg-amber-600 text-white shadow-md' : 'text-amber-700 hover:bg-amber-50',
  };

  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${colors[color]}`}
    >
      {label}
    </button>
  );
};
