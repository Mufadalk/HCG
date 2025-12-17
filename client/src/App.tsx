import { useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';

// Types
interface Card {
    id: number;
    name: string;
    image_path: string;
    category: string;
}

// === COMPONENTS ===

function Header() {
    return (
        <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
            <div className="max-w-md mx-auto flex justify-between items-center">
                <h1 className="text-xl font-bold text-gray-800">CardGen</h1>
                <nav>
                    <button onClick={() => window.location.hash = ''} className="text-sm font-medium text-gray-600 hover:text-gray-900 mr-4">Home</button>
                    <button onClick={() => window.location.hash = '#admin'} className="text-sm font-medium text-gray-600 hover:text-gray-900">Admin</button>
                </nav>
            </div>
        </header>
    );
}

// 0. Login Screen
function LoginScreen({ onLogin }: { onLogin: (token: string) => void }) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 w-full max-w-md text-center">
                <h2 className="text-2xl font-bold mb-2">Welcome</h2>
                <p className="text-gray-500 mb-8">Please sign in with your Google account to continue.</p>
                <div className="flex justify-center">
                    <GoogleLogin
                        onSuccess={credentialResponse => {
                            const t = credentialResponse.credential;
                            if (t) {
                                onLogin(t);
                            }
                        }}
                        onError={() => alert('Login Failed')}
                    />
                </div>
            </div>
        </div>
    );
}

// 1. Selection Screen
function SelectionScreen({ onSelect, token }: { onSelect: (card: Card) => void, token: string }) {
    const [cards, setCards] = useState<Card[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('All');

    useEffect(() => {
        fetch('/api/cards', { headers: { 'Authorization': `Bearer ${token}` } })
            .then(res => {
                if (res.status === 401) throw new Error('Unauthorized');
                return res.json();
            })
            .then(data => {
                setCards(data);
                setLoading(false);
            })
            .catch(err => console.error(err));
    }, [token]);

    const categories = ['All', ...new Set(cards.map(c => c.category))];
    const filteredCards = filter === 'All' ? cards : cards.filter(c => c.category === filter);

    if (loading) return <div className="p-8 text-center">Loading cards...</div>;

    return (
        <div className="p-4 max-w-md mx-auto">
            <div className="flex gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar">
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setFilter(cat)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filter === cat
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
                {filteredCards.map(card => (
                    <div
                        key={card.id}
                        onClick={() => onSelect(card)}
                        className="group cursor-pointer rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all active:scale-95 bg-white"
                    >
                        <div className="aspect-[9/16] relative bg-gray-50">
                            <img
                                src={`/${card.image_path}`}
                                alt={card.name}
                                className="absolute inset-0 w-full h-full object-cover"
                                loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                        </div>
                        <div className="p-3">
                            <h3 className="text-sm font-semibold text-gray-800 truncate">{card.name}</h3>
                            <p className="text-xs text-gray-500">{card.category}</p>
                        </div>
                    </div>
                ))}
            </div>
            {filteredCards.length === 0 && (
                <div className="text-center py-10 text-gray-500">No cards found.</div>
            )}
        </div>
    );
}

// 2. Personalize Screen
function PersonalizeScreen({ card, onBack, token }: { card: Card, onBack: () => void, token: string }) {
    const [name, setName] = useState('');
    const [greeting, setGreeting] = useState('');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [generating, setGenerating] = useState(false);
    const [greetings, setGreetings] = useState<{ id: number, text: string }[]>([]);

    useEffect(() => {
        fetch('/api/greetings', { headers: { 'Authorization': `Bearer ${token}` } })
            .then(res => res.json())
            .then(data => setGreetings(data))
            .catch(err => console.error(err));
    }, [token]);

    const handleGenerate = async () => {
        if (!name.trim()) return;
        setGenerating(true);
        try {
            const res = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ cardId: card.id, userName: name, greeting })
            });
            const data = await res.json();
            setPreviewUrl(data.url);
        } catch (e) {
            alert('Failed to generate card');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            {/* Top Bar */}
            <div className="flex items-center p-4 bg-white shadow-sm shrink-0">
                <button onClick={onBack} className="p-2 -ml-2 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100">
                    ← Back
                </button>
                <span className="ml-2 font-semibold">Personalize</span>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center">
                <div className="w-full max-w-4xl bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden flex flex-col md:flex-row">
                    {/* Card Preview Section */}
                    <div className="md:w-1/2 bg-gray-100 relative aspect-[9/16] md:aspect-auto md:h-[600px] flex items-center justify-center">
                        {previewUrl ? (
                            <img src={previewUrl} className="w-full h-full object-contain" key={previewUrl} />
                        ) : (
                            <img src={`/${card.image_path}`} className="w-full h-full object-contain p-4 opacity-90" />
                        )}

                        {generating && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm">
                                <div className="animate-spin rounded-full h-10 w-10 border-4 border-white border-t-transparent"></div>
                            </div>
                        )}
                    </div>

                    {/* Controls Section */}
                    <div className="md:w-1/2 p-8 flex flex-col justify-center space-y-6">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 mb-2">Details</h2>
                            <p className="text-gray-500 mb-6">Customize your {card.name} card by adding your name or family name below.</p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Select a Greeting (Optional)</label>
                                    <select
                                        value={greeting}
                                        onChange={e => setGreeting(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white"
                                    >
                                        <option value="">None</option>
                                        {greetings.map(g => (
                                            <option key={g.id} value={g.text}>{g.text}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Enter your name</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        placeholder="e.g. The Smith Family"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                        autoFocus
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleGenerate}
                            disabled={!name.trim() || generating}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-600/20"
                        >
                            {generating ? 'Generating...' : 'Generate Preview'}
                        </button>

                        {previewUrl && (
                            <div className="flex gap-4 pt-4">
                                <a
                                    href={previewUrl}
                                    download={`holiday-card-${card.id}.png`}
                                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3 rounded-xl text-center transition-all"
                                >
                                    Download Image
                                </a>
                                <button
                                    onClick={() => {
                                        if (navigator.share) {
                                            navigator.share({
                                                title: 'My Holiday Card',
                                                text: 'Check out my holiday card!',
                                                url: window.location.origin + previewUrl
                                            }).catch(console.error);
                                        } else {
                                            navigator.clipboard.writeText(window.location.origin + previewUrl);
                                            alert('Link copied to clipboard!');
                                        }
                                    }}
                                    className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold py-3 rounded-xl transition-all"
                                >
                                    Share Link
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// 3. Admin Dashboard
function AdminDashboard({ token, onLogout }: { token: string, onLogout: () => void }) {
    const [stats, setStats] = useState({ totalGenerated: 0, popularCards: [] });
    const [cards, setCards] = useState<Card[]>([]);
    const [greetings, setGreetings] = useState<{ id: number, text: string }[]>([]);
    const [newGreeting, setNewGreeting] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        refresh();
    }, []);

    const authFetch = async (url: string, options: RequestInit = {}) => {
        const headers = { ...options.headers, 'Authorization': `Bearer ${token}` };
        const res = await fetch(url, { ...options, headers });
        if (res.status === 401) {
            alert('Session expired');
            onLogout();
            throw new Error('Unauthorized');
        }
        if (res.status === 403) {
            setError('Access Denied: Admins Only');
            throw new Error('Forbidden');
        }
        return res;
    };

    const refresh = () => {
        authFetch('/api/stats').then(res => res.json()).then(setStats).catch(() => { });
        authFetch('/api/cards?admin=true').then(res => res.json()).then(setCards).catch(() => { });
        authFetch('/api/greetings').then(res => res.json()).then(setGreetings).catch(() => { });
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this card?')) return;
        await authFetch(`/api/cards/${id}`, { method: 'DELETE' });
        refresh();
    };

    const handleAddGreeting = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGreeting.trim()) return;
        await authFetch('/api/greetings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: newGreeting })
        });
        setNewGreeting('');
        fetchGreetings();
    };

    // Helper to refresh greetings specifically
    const fetchGreetings = () => authFetch('/api/greetings').then(res => res.json()).then(setGreetings);


    const handleDeleteGreeting = async (id: number) => {
        if (!confirm('Delete this greeting?')) return;
        await authFetch(`/api/greetings/${id}`, { method: 'DELETE' });
        fetchGreetings();
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget as HTMLFormElement);
        await authFetch('/api/cards', { method: 'POST', body: formData });
        (e.target as HTMLFormElement).reset();
        refresh();
        alert('Card uploaded!');
    };

    if (error) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-red-600 mb-4">{error}</h1>
                    <p className="text-gray-600 mb-8">You do not have permission to view this page.</p>
                    <button onClick={() => window.location.hash = ''} className="bg-gray-200 px-4 py-2 rounded">Go Back Home</button>
                    <button onClick={onLogout} className="ml-4 bg-red-100 text-red-600 px-4 py-2 rounded">Logout</button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <button
                    onClick={onLogout}
                    className="text-gray-500 hover:text-red-600 font-medium"
                >
                    Logout
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-gray-500 text-sm font-medium uppercase mb-2">Total Cards Generated</h3>
                    <p className="text-4xl font-bold text-gray-900">{stats.totalGenerated || 0}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 col-span-2">
                    <h3 className="text-gray-500 text-sm font-medium uppercase mb-4">Most Popular Designs</h3>
                    <div className="space-y-3">
                        {stats.popularCards.map((c: any, i) => (
                            <div key={i} className="flex justify-between items-center">
                                <span className="font-medium text-gray-700">{c.name}</span>
                                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-bold">{c.use_count} uses</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Upload Section */}
                <div>
                    <h2 className="text-xl font-bold mb-6">Upload New Card</h2>
                    <form onSubmit={handleUpload} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Card Image</label>
                            <input name="image" type="file" required className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Card Name</label>
                                <input name="name" type="text" required placeholder="e.g. Snowy Hills" className="w-full px-4 py-2 rounded-lg border border-gray-200" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                <input name="category" type="text" required placeholder="e.g. Holiday" className="w-full px-4 py-2 rounded-lg border border-gray-200" />
                            </div>
                        </div>
                        <button type="submit" className="w-full bg-black text-white font-bold py-3 rounded-lg hover:bg-gray-800 transition-colors">Upload Card</button>
                    </form>
                </div>

                {/* Greetings Management Section */}
                <div>
                    <h2 className="text-xl font-bold mb-6">Manage Greetings</h2>
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                        <form onSubmit={handleAddGreeting} className="flex gap-2 mb-6">
                            <input
                                value={newGreeting}
                                onChange={e => setNewGreeting(e.target.value)}
                                placeholder="Add new greeting..."
                                className="flex-1 px-4 py-2 rounded-lg border border-gray-200"
                            />
                            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold">Add</button>
                        </form>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {greetings.map(g => (
                                <div key={g.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                    <span>{g.text}</span>
                                    <button onClick={() => handleDeleteGreeting(g.id)} className="text-red-500 hover:text-red-700 text-sm font-bold">Delete</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Existing Cards List */}
            <div className="mt-12">
                <h2 className="text-xl font-bold mb-6">Active Cards</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {cards.map(card => (
                        <div key={card.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4">
                            <img src={`/${card.image_path}`} className="w-24 h-32 object-cover rounded-lg bg-gray-100" />
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-900">{card.name}</h3>
                                <p className="text-sm text-gray-500 mb-4">{card.category}</p>
                                <button onClick={() => handleDelete(card.id)} className="text-red-500 text-sm font-bold hover:text-red-700">Delete Card</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// === MAIN APP ===

function App() {
    // Simple Hash Router replacement for simplicity
    const [route, setRoute] = useState(window.location.hash || '');
    const [selectedCard, setSelectedCard] = useState<Card | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('auth_token'));

    useEffect(() => {
        const handleHashChange = () => setRoute(window.location.hash);
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    const handleLogin = (t: string) => {
        setToken(t);
        localStorage.setItem('auth_token', t);
    };

    const handleLogout = () => {
        setToken(null);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('admin_token'); // Cleanup old generic token if exists
        window.location.hash = '';
    };

    if (!token) {
        return <LoginScreen onLogin={handleLogin} />;
    }

    // Simple Router Logic
    let content;
    if (route === '#admin') {
        content = <AdminDashboard token={token} onLogout={handleLogout} />;
    } else if (selectedCard) {
        content = <PersonalizeScreen card={selectedCard} onBack={() => setSelectedCard(null)} token={token} />;
    } else {
        content = <SelectionScreen onSelect={setSelectedCard} token={token} />;
    }

    return (
        <div className="min-h-screen bg-white text-gray-900 font-sans pb-10">
            <Header />
            <main>
                {content}
            </main>
        </div>
    );
}

export default App;
