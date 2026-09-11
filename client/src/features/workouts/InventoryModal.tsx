import React, { useState } from 'react';
import {
  X,
  Dumbbell,
  Plus,
  Trash2,
  Check,
  Sparkles,
  TrendingUp,
  Package,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import {
  useInventory,
  useUpdateInventory,
  useUpdateWorkingWeight,
} from '../../services/inventoryService';
import { EquipmentItem } from '../../types';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESETS: { id: string; name: string; description: string; items: EquipmentItem[] }[] = [
  {
    id: 'home-dumbbells',
    name: 'Home Dumbbell Starter',
    description: 'Adjustable dumbbells, incline bench, and resistance bands',
    items: [
      {
        id: 'db-1',
        type: 'dumbbell',
        name: 'Adjustable Dumbbells Set',
        availableWeightsKg: [2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20],
        notes: 'Spinlock pairs up to 20kg each',
      },
      {
        id: 'bench-1',
        type: 'bench',
        name: 'Adjustable Incline / Flat Bench',
        availableWeightsKg: [],
        notes: 'Flat to 90 degrees incline',
      },
      {
        id: 'bands-1',
        type: 'bands',
        name: 'Resistance Bands Loop Set',
        availableWeightsKg: [5, 10, 15, 20],
        notes: 'Light, medium, heavy bands',
      },
      {
        id: 'pullup-1',
        type: 'pullup_bar',
        name: 'Doorway Pull-up Bar',
        availableWeightsKg: [],
        notes: 'Home door frame mount',
      },
    ],
  },
  {
    id: 'commercial-gym',
    name: 'Full Commercial Gym Access',
    description: 'Full dumbbell rack, olympic barbells, cables, and pin-loaded machines',
    items: [
      {
        id: 'gym-db',
        type: 'dumbbell',
        name: 'Full Dumbbell Rack (2.5kg - 50kg)',
        availableWeightsKg: [2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 27.5, 30, 35, 40, 45, 50],
        notes: '2.5kg increments',
      },
      {
        id: 'gym-barbell',
        type: 'barbell',
        name: 'Olympic Barbell & Bumper/Iron Plates',
        availableWeightsKg: [],
        platePairsKg: [1.25, 2.5, 5, 10, 15, 20, 25],
        barbellWeightKg: 20,
        notes: 'Standard 20kg Olympic barbell',
      },
      {
        id: 'gym-cables',
        type: 'cable',
        name: 'Dual Adjustable Cable Tower',
        availableWeightsKg: [5, 10, 15, 20, 25, 30, 35, 40, 50, 60, 70, 80],
        notes: 'Rope, straight bar, D-handles',
      },
      {
        id: 'gym-bench',
        type: 'bench',
        name: 'Commercial Benches & Squat Racks',
        availableWeightsKg: [],
        notes: 'Flat, incline, decline benches + power cages',
      },
      {
        id: 'gym-machines',
        type: 'machine',
        name: 'Leg Press, Hamstring Curl & Extension Machines',
        availableWeightsKg: [],
        notes: 'Full pin-loaded and plate-loaded selectorized equipment',
      },
    ],
  },
  {
    id: 'garage-barbell',
    name: 'Garage Gym / Barbell & Rack',
    description: '20kg Olympic Barbell, weight plate tree, and heavy-duty squat cage',
    items: [
      {
        id: 'barbell-garage',
        type: 'barbell',
        name: 'Olympic 20kg Barbell',
        availableWeightsKg: [],
        platePairsKg: [1.25, 2.5, 5, 10, 15, 20],
        barbellWeightKg: 20,
        notes: 'Standard 7ft Olympic bar',
      },
      {
        id: 'bench-garage',
        type: 'bench',
        name: 'Flat & Incline Utility Bench',
        availableWeightsKg: [],
      },
      {
        id: 'plates-garage',
        type: 'plates',
        name: 'Iron Weight Plates Set (107.5kg total pairs)',
        availableWeightsKg: [],
        platePairsKg: [1.25, 2.5, 5, 10, 15, 20],
      },
      {
        id: 'pullup-garage',
        type: 'pullup_bar',
        name: 'Power Rack Pull-up Bar',
        availableWeightsKg: [],
      },
    ],
  },
  {
    id: 'bodyweight-minimalist',
    name: 'Calisthenics & Minimalist Home',
    description: 'Bodyweight only, doorway bar, and light resistance accessories',
    items: [
      {
        id: 'bw-bar',
        type: 'pullup_bar',
        name: 'Pull-up / Chin-up Station',
        availableWeightsKg: [],
      },
      {
        id: 'bw-bands',
        type: 'bands',
        name: 'Assistance & Resistance Bands',
        availableWeightsKg: [5, 10, 15, 25],
      },
    ],
  },
];

export const InventoryModal: React.FC<InventoryModalProps> = ({ isOpen, onClose }) => {
  const { data: inventory } = useInventory();
  const updateInventoryMutation = useUpdateInventory();
  const updateWorkingWeightMutation = useUpdateWorkingWeight();

  const [activeTab, setActiveTab] = useState<'equipment' | 'working-weights'>('equipment');

  // Custom item state
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customType, setCustomType] = useState<EquipmentItem['type']>('dumbbell');
  const [customName, setCustomName] = useState('');
  const [customWeightsStr, setCustomWeightsStr] = useState('');
  const [customNotes, setCustomNotes] = useState('');

  // Working weight quick edit state
  const [editingExercise, setEditingExercise] = useState<string | null>(null);
  const [editWeightVal, setEditWeightVal] = useState<number>(0);
  const [editRepsVal, setEditRepsVal] = useState<number>(10);

  // New working weight manual add
  const [showAddWeight, setShowAddWeight] = useState(false);
  const [newExName, setNewExName] = useState('');
  const [newExWeight, setNewExWeight] = useState<number>(15);
  const [newExReps, setNewExReps] = useState<number>(10);

  if (!isOpen) return null;

  const currentEquipment: EquipmentItem[] = inventory?.equipment || [];
  const currentWorkingWeights = inventory?.workingWeights || [];

  const handleApplyPreset = async (presetItems: EquipmentItem[]) => {
    await updateInventoryMutation.mutateAsync(presetItems);
  };

  const handleRemoveEquipment = async (id: string) => {
    const next = currentEquipment.filter((item) => item.id !== id);
    await updateInventoryMutation.mutateAsync(next);
  };

  const handleAddCustomEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const weightsParsed = customWeightsStr
      .split(',')
      .map((w) => parseFloat(w.trim()))
      .filter((w) => !isNaN(w) && w > 0);

    const newItem: EquipmentItem = {
      id: `eq-${Date.now()}`,
      type: customType,
      name: customName.trim(),
      availableWeightsKg: weightsParsed,
      notes: customNotes.trim() || undefined,
    };

    await updateInventoryMutation.mutateAsync([...currentEquipment, newItem]);
    setCustomName('');
    setCustomWeightsStr('');
    setCustomNotes('');
    setShowAddCustom(false);
  };

  const handleSaveWorkingWeight = async (exerciseName: string, weightKg: number, reps: number) => {
    await updateWorkingWeightMutation.mutateAsync({
      exerciseName,
      currentWeightKg: weightKg,
      targetReps: reps,
      date: new Date().toISOString().split('T')[0],
    });
    setEditingExercise(null);
  };

  const handleAddManualWorkingWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExName.trim() || newExWeight <= 0) return;

    await updateWorkingWeightMutation.mutateAsync({
      exerciseName: newExName.trim(),
      currentWeightKg: newExWeight,
      targetReps: newExReps,
      date: new Date().toISOString().split('T')[0],
    });

    setNewExName('');
    setNewExWeight(15);
    setNewExReps(10);
    setShowAddWeight(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#141721] border border-slate-800/80 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-[#0C0E14]/40">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Package size={20} />
            </span>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Gym & Equipment Inventory</h2>
              <p className="text-xs text-slate-400">
                Track owned equipment, dumbbells, barbell plates, and working weights
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800/60 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-800/80 bg-[#0C0E14]/20">
          <button
            onClick={() => setActiveTab('equipment')}
            className={`flex items-center gap-2 pb-3 px-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'equipment'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Dumbbell size={16} />
            Equipment & Weights ({currentEquipment.length})
          </button>
          <button
            onClick={() => setActiveTab('working-weights')}
            className={`flex items-center gap-2 pb-3 px-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'working-weights'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp size={16} />
            Working Weights Log ({currentWorkingWeights.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1">
          {activeTab === 'equipment' ? (
            <div className="space-y-6">
              {/* Presets Row */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-amber-400" />
                    1-Click Equipment Presets
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handleApplyPreset(preset.items)}
                      disabled={updateInventoryMutation.isPending}
                      className="p-3.5 rounded-xl bg-[#0C0E14] border border-slate-800 hover:border-emerald-500/50 text-left transition-all group flex flex-col justify-between"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-200 group-hover:text-emerald-400 transition-colors">
                          {preset.name}
                        </p>
                        <p className="text-xs text-slate-400 line-clamp-2">{preset.description}</p>
                      </div>
                      <span className="text-[11px] font-mono text-emerald-400/80 pt-2 flex items-center gap-1">
                        Apply Setup &rarr;
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Equipment List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Your Current Inventory
                  </h3>
                  <Button
                    variant="secondary"
                    onClick={() => setShowAddCustom(!showAddCustom)}
                    className="text-xs py-1 px-3 gap-1.5"
                  >
                    <Plus size={14} />
                    {showAddCustom ? 'Cancel' : 'Add Custom Item'}
                  </Button>
                </div>

                {/* Add Custom Item Form */}
                {showAddCustom && (
                  <form
                    onSubmit={handleAddCustomEquipment}
                    className="p-4 rounded-xl bg-[#0C0E14] border border-emerald-500/30 space-y-3 animate-in fade-in duration-150"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Equipment Name</label>
                        <Input
                          placeholder="e.g. Hex Dumbbells Pair"
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Type</label>
                        <select
                          value={customType}
                          onChange={(e) => setCustomType(e.target.value as any)}
                          className="w-full bg-[#141721] border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                        >
                          <option value="dumbbell">Dumbbell</option>
                          <option value="barbell">Barbell</option>
                          <option value="plates">Weight Plates</option>
                          <option value="bench">Bench</option>
                          <option value="pullup_bar">Pull-up Bar</option>
                          <option value="bands">Resistance Bands</option>
                          <option value="cable">Cable</option>
                          <option value="machine">Machine</option>
                          <option value="kettlebell">Kettlebell</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-slate-400 block mb-1">
                        Available Weights (kg, comma-separated)
                      </label>
                      <Input
                        placeholder="e.g. 5, 7.5, 10, 12.5, 15"
                        value={customWeightsStr}
                        onChange={(e) => setCustomWeightsStr(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Notes (Optional)</label>
                      <Input
                        placeholder="e.g. Stored in bedroom corner"
                        value={customNotes}
                        onChange={(e) => setCustomNotes(e.target.value)}
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setShowAddCustom(false)}
                        className="text-xs py-1"
                      >
                        Cancel
                      </Button>
                      <Button type="submit" variant="primary" className="text-xs py-1 gap-1">
                        <Check size={14} />
                        Save Item
                      </Button>
                    </div>
                  </form>
                )}

                {/* List Items */}
                {currentEquipment.length === 0 ? (
                  <div className="p-8 text-center rounded-xl bg-[#0C0E14] border border-slate-800/80 text-slate-400">
                    <p className="text-sm">No equipment configured yet.</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Choose one of the presets above or add your own equipment.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {currentEquipment.map((item) => (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-xl bg-[#0C0E14] border border-slate-800/80 flex items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white">{item.name}</span>
                            <Badge variant="neutral" className="capitalize text-[10px] text-slate-400">
                              {item.type.replace('_', ' ')}
                            </Badge>
                          </div>
                          {item.availableWeightsKg && item.availableWeightsKg.length > 0 && (
                            <p className="text-xs text-slate-400">
                              Weights: <span className="font-mono text-emerald-400">{item.availableWeightsKg.join(', ')} kg</span>
                            </p>
                          )}
                          {item.platePairsKg && item.platePairsKg.length > 0 && (
                            <p className="text-xs text-slate-400">
                              Plate pairs: <span className="font-mono text-cyan-400">{item.platePairsKg.join(', ')} kg</span>
                              {item.barbellWeightKg && ` (${item.barbellWeightKg}kg bar)`}
                            </p>
                          )}
                          {item.notes && <p className="text-xs text-slate-500">{item.notes}</p>}
                        </div>
                        <button
                          onClick={() => handleRemoveEquipment(item.id)}
                          className="text-slate-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Working Weights Tracker Tab */
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Recorded Working Weights
                  </h3>
                  <p className="text-xs text-slate-500">
                    Weights auto-sync when you complete sets in the workout tracker
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => setShowAddWeight(!showAddWeight)}
                  className="text-xs py-1 px-3 gap-1.5"
                >
                  <Plus size={14} />
                  {showAddWeight ? 'Cancel' : 'Track New Exercise'}
                </Button>
              </div>

              {/* Add Manual Working Weight Form */}
              {showAddWeight && (
                <form
                  onSubmit={handleAddManualWorkingWeight}
                  className="p-4 rounded-xl bg-[#0C0E14] border border-emerald-500/30 space-y-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-1">
                      <label className="text-xs text-slate-400 block mb-1">Exercise Name</label>
                      <Input
                        placeholder="e.g. Barbell Bench Press"
                        value={newExName}
                        onChange={(e) => setNewExName(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Current Working Weight (kg)</label>
                      <Input
                        type="number"
                        step="0.5"
                        value={newExWeight}
                        onChange={(e) => setNewExWeight(parseFloat(e.target.value) || 0)}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Target Reps</label>
                      <Input
                        type="number"
                        value={newExReps}
                        onChange={(e) => setNewExReps(parseInt(e.target.value) || 10)}
                        required
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setShowAddWeight(false)}
                      className="text-xs py-1"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary" className="text-xs py-1 gap-1">
                      <Check size={14} />
                      Save Weight
                    </Button>
                  </div>
                </form>
              )}

              {/* Working Weights Table */}
              {currentWorkingWeights.length === 0 ? (
                <div className="p-8 text-center rounded-xl bg-[#0C0E14] border border-slate-800/80 text-slate-400 space-y-2">
                  <TrendingUp size={32} className="mx-auto text-slate-600" />
                  <p className="text-sm">No working weights recorded yet.</p>
                  <p className="text-xs text-slate-500">
                    Log exercises in your active workout session or add one manually above to start tracking your progressive overload!
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-800/80 overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#0C0E14] text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="p-3.5 pl-4">Exercise</th>
                        <th className="p-3.5 text-center">Working Weight</th>
                        <th className="p-3.5 text-center">Target Reps</th>
                        <th className="p-3.5 text-right pr-4">Last Updated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-[#0C0E14]/40 font-mono text-xs">
                      {currentWorkingWeights.map((ww) => (
                        <tr key={ww.exerciseName} className="hover:bg-slate-800/30 transition-colors">
                          <td className="p-3.5 pl-4 font-sans font-medium text-slate-200">
                            {ww.exerciseName}
                          </td>
                          <td className="p-3.5 text-center">
                            {editingExercise === ww.exerciseName ? (
                              <div className="flex items-center justify-center gap-1">
                                <input
                                  type="number"
                                  step="0.5"
                                  className="w-16 bg-slate-900 border border-emerald-500 rounded px-1.5 py-0.5 text-center text-white"
                                  value={editWeightVal}
                                  onChange={(e) => setEditWeightVal(parseFloat(e.target.value) || 0)}
                                />
                                <button
                                  onClick={() =>
                                    handleSaveWorkingWeight(ww.exerciseName, editWeightVal, editRepsVal)
                                  }
                                  className="p-1 rounded bg-emerald-500 text-black hover:bg-emerald-400"
                                >
                                  <Check size={12} />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingExercise(ww.exerciseName);
                                  setEditWeightVal(ww.currentWeightKg);
                                  setEditRepsVal(ww.targetReps || 10);
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold hover:bg-emerald-500/20 transition-colors"
                              >
                                <span>{ww.currentWeightKg} kg</span>
                              </button>
                            )}
                          </td>
                          <td className="p-3.5 text-center text-slate-300">
                            {ww.targetReps || 10} reps
                          </td>
                          <td className="p-3.5 text-right pr-4 text-slate-500">
                            {ww.lastUsedDate || 'Recently'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#0C0E14]/40 flex justify-end">
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};
