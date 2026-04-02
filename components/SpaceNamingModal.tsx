import React, { useState } from 'react';
import { Save, Sparkles, Users, Briefcase, Heart, Home, Calendar } from 'lucide-react';

interface SpaceTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  suggestedWidgets: string[];
}

const SPACE_TEMPLATES: SpaceTemplate[] = [
  {
    id: 'cool-girls',
    name: 'Cool Girls',
    description: 'For your squad adventures',
    icon: <Sparkles className="w-5 h-5" />,
    color: 'from-pink-400 to-purple-500',
    suggestedWidgets: [
      'Group chat mood tracker',
      'Outfit voting app',
      'Squad bucket list',
      'Drama-free decision maker',
      'Photo memory wall',
      'Group playlist creator'
    ]
  },
  {
    id: 'office',
    name: 'Office',
    description: 'Work projects & team tools',
    icon: <Briefcase className="w-5 h-5" />,
    color: 'from-blue-400 to-cyan-500',
    suggestedWidgets: [
      'Team standup tracker',
      'Meeting room booking',
      'Time zone converter',
      'Project deadline counter',
      'Employee birthday reminder',
      'Coffee order organizer'
    ]
  },
  {
    id: 'besties',
    name: 'Besties',
    description: 'Best friend hangout zone',
    icon: <Users className="w-5 h-5" />,
    color: 'from-green-400 to-teal-500',
    suggestedWidgets: [
      'Friendship quiz maker',
      'Movie night picker',
      'Food craving matcher',
      'Adventure idea generator',
      'Memory lane photo shuffler',
      'Text thread highlights'
    ]
  },
  {
    id: 'family',
    name: 'Family',
    description: 'Family activities & planning',
    icon: <Home className="w-5 h-5" />,
    color: 'from-orange-400 to-red-500',
    suggestedWidgets: [
      'Chore rotation tracker',
      'Family meal planner',
      'Kid activity scheduler',
      'House maintenance reminder',
      'Family game night selector',
      'Birthday and anniversary tracker'
    ]
  },
  {
    id: 'couple-planning',
    name: 'Couple Planning',
    description: 'Date nights & future plans',
    icon: <Heart className="w-5 h-5" />,
    color: 'from-rose-400 to-pink-500',
    suggestedWidgets: [
      'Date night idea generator',
      'Relationship milestone tracker',
      'Budget planner for couples',
      'Anniversary countdown',
      'Travel wishlist organizer',
      'Love language reminder'
    ]
  }
];

interface SpaceNamingModalProps {
  onCreateSpace: (name: string, description?: string, selectedWidgets?: string[]) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  widgetCount: number;
}

export const SpaceNamingModal: React.FC<SpaceNamingModalProps> = ({
  onCreateSpace,
  onCancel,
  loading,
  widgetCount
}) => {
  const [step, setStep] = useState<'template' | 'naming' | 'widgets'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<SpaceTemplate | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedWidgets, setSelectedWidgets] = useState<string[]>([]);

  const handleTemplateSelect = (template: SpaceTemplate) => {
    setSelectedTemplate(template);
    setName(template.name);
    setDescription(template.description);
    setSelectedWidgets([]);
    setStep('naming');
  };

  const handleWidgetToggle = (widget: string) => {
    setSelectedWidgets(prev =>
      prev.includes(widget)
        ? prev.filter(w => w !== widget)
        : [...prev, widget]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // If we have a template selected and no widgets chosen yet, go to widget selection
    if (selectedTemplate && selectedWidgets.length === 0 && widgetCount === 0) {
      setStep('widgets');
      return;
    }

    // Otherwise, create the space
    await onCreateSpace(name.trim(), description.trim() || undefined, selectedWidgets);
  };

  if (step === 'template') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-8">
          <div className="w-16 h-16 mx-auto mb-6 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-400 via-blue-400 to-green-400 rounded-xl transform rotate-3 opacity-80"></div>
            <div className="absolute inset-0.5 bg-gradient-to-tl from-pink-300 via-purple-300 to-blue-300 rounded-lg transform -rotate-2"></div>
            <div className="absolute inset-1 bg-gradient-to-br from-blue-200 via-green-200 to-pink-200 rounded-md flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-slate-700" />
            </div>
          </div>

          <h1 className="text-2xl font-semibold text-slate-800 mb-2 text-center">
            Choose Your Space
          </h1>
          <p className="text-slate-600 mb-8 text-center leading-relaxed">
            Pick a template to get started, or create a custom space
          </p>

          <div className="grid grid-cols-3 gap-4 mb-6">
            {SPACE_TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => handleTemplateSelect(template)}
                className="p-4 border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-md transition-all duration-200 text-left group"
              >
                <div className={`w-12 h-12 bg-gradient-to-br ${template.color} rounded-lg flex items-center justify-center text-white mb-3 group-hover:scale-105 transition-transform`}>
                  {template.icon}
                </div>
                <h3 className="font-semibold text-slate-800 mb-1">{template.name}</h3>
                <p className="text-sm text-slate-600">{template.description}</p>
              </button>
            ))}

            {/* Custom space option as a template box */}
            <button
              onClick={() => {
                setSelectedTemplate(null);
                setName('');
                setDescription('');
                setSelectedWidgets([]);
                setStep('naming');
              }}
              className="p-4 border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-md transition-all duration-200 text-left group border-dashed"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-slate-500 rounded-lg flex items-center justify-center text-white mb-3 group-hover:scale-105 transition-transform">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="font-semibold text-slate-800 mb-1">Custom</h3>
              <p className="text-sm text-slate-600">Create your own space</p>
            </button>
          </div>

          <div className="flex justify-center mt-6">
            <button
              onClick={onCancel}
              className="py-2 px-6 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'widgets' && selectedTemplate) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-8">
          <div className={`w-16 h-16 mx-auto mb-6 bg-gradient-to-br ${selectedTemplate.color} rounded-xl flex items-center justify-center text-white`}>
            {selectedTemplate.icon}
          </div>

          <h1 className="text-2xl font-semibold text-slate-800 mb-2 text-center">
            Choose Your Apps
          </h1>
          <p className="text-slate-600 mb-8 text-center leading-relaxed">
            Select the apps you'd like to create for your <strong>{selectedTemplate.name}</strong> space
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8 max-h-80 overflow-y-auto">
            {selectedTemplate.suggestedWidgets.map((widget) => (
              <label
                key={widget}
                className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg hover:border-slate-300 hover:bg-slate-50 cursor-pointer transition-all"
              >
                <input
                  type="checkbox"
                  checked={selectedWidgets.includes(widget)}
                  onChange={() => handleWidgetToggle(widget)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700 flex-1">{widget}</span>
              </label>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('naming')}
              className="flex-1 py-3 px-4 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              ← Back to Naming
            </button>
            <button
              onClick={async () => {
                if (!name.trim()) return;
                await onCreateSpace(name.trim(), description.trim() || undefined, selectedWidgets);
              }}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Create Space ({selectedWidgets.length} selected)
            </button>
          </div>

          <div className="text-center mt-4">
            <button
              onClick={async () => {
                if (!name.trim()) return;
                setSelectedWidgets([]);
                await onCreateSpace(name.trim(), description.trim() || undefined, []);
              }}
              className="text-slate-500 hover:text-slate-700 text-sm underline underline-offset-4"
            >
              Skip - I'll add apps later
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-8">
        {selectedTemplate && (
          <div className="text-center mb-6">
            <div className={`w-16 h-16 mx-auto mb-3 bg-gradient-to-br ${selectedTemplate.color} rounded-xl flex items-center justify-center text-white`}>
              {selectedTemplate.icon}
            </div>
            <button
              onClick={() => setStep('template')}
              className="text-sm text-slate-500 hover:text-slate-700 underline underline-offset-4"
            >
              ← Choose different template
            </button>
          </div>
        )}

        <h1 className="text-2xl font-semibold text-slate-800 mb-2 text-center">
          {widgetCount > 0 ? 'Save Your Space' : (selectedTemplate ? 'Name Your Space' : 'Create Your Space')}
        </h1>
        <p className="text-slate-600 mb-6 text-center leading-relaxed">
          {widgetCount > 0
            ? `You're about to save ${widgetCount} widget${widgetCount !== 1 ? 's' : ''} to a new space.`
            : (selectedTemplate
                ? `Give your ${selectedTemplate.name} space a personalized name and description.`
                : 'Give your space a name and get ready to create your first widget!'
              )
          }
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="space-name" className="block text-sm font-medium text-slate-700 mb-2">
              Space Name *
            </label>
            <input
              id="space-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome Space"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              maxLength={50}
              disabled={loading}
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="space-description" className="block text-sm font-medium text-slate-700 mb-2">
              Description (optional)
            </label>
            <textarea
              id="space-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this space for?"
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              maxLength={200}
              disabled={loading}
            />
          </div>

          {selectedWidgets.length > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-slate-700 mb-2">Selected Apps ({selectedWidgets.length})</p>
              <div className="flex flex-wrap gap-2">
                {selectedWidgets.map((widget) => (
                  <span key={widget} className="text-xs bg-white px-2 py-1 rounded-md text-slate-600 border">
                    {widget}
                  </span>
                ))}
              </div>
            </div>
          )}

          {widgetCount === 0 && selectedWidgets.length === 0 && (
            <div className="flex items-center gap-3 text-left bg-blue-50 p-4 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-slate-700">Ready to build?</p>
                <p className="text-xs text-slate-600">After creating your space, you'll be prompted to create your first widget!</p>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => selectedTemplate ? setStep('template') : onCancel()}
              disabled={loading}
              className="flex-1 py-3 px-4 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {selectedTemplate ? 'Back' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {selectedTemplate && selectedWidgets.length === 0 && widgetCount === 0 ? (
                    <>
                      <span>Continue to Apps</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      <span>Create Space</span>
                    </>
                  )}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};