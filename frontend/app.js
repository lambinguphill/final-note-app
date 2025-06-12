// Simple React app without build tools
const { useState, useEffect } = React;

const API_BASE_URL = 'http://localhost:8000/api/v1';

const NoteKeeperApp = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [notes, setNotes] = useState([]);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [noteContent, setNoteContent] = useState('');
    const [error, setError] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (token) {
            setIsLoggedIn(true);
            fetchNotes();
        }
    }, [token]);

    const handleAuth = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        
        try {
            const endpoint = isRegistering ? '/auth/register' : '/auth/login';
            const body = isRegistering 
                ? JSON.stringify({ email, password, full_name: email.split('@')[0] })
                : new URLSearchParams({ username: email, password });
            
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': isRegistering ? 'application/json' : 'application/x-www-form-urlencoded',
                },
                body: body
            });
            
            const data = await response.json();
            
            if (response.ok) {
                if (isRegistering) {
                    setIsRegistering(false);
                    setError('Registration successful! Please login.');
                } else {
                    localStorage.setItem('token', data.access_token);
                    setToken(data.access_token);
                    setIsLoggedIn(true);
                    showWelcomeMessage();
                }
            } else {
                setError(data.detail || 'Authentication failed');
            }
        } catch (err) {
            setError('Network error. Make sure the backend is running on port 8000.');
        } finally {
            setLoading(false);
        }
    };

    const showWelcomeMessage = () => {
        const messages = ["Welcome", "Let's Build a World"];
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        
        messages.forEach((text, index) => {
            setTimeout(() => {
                const message = document.createElement('div');
                message.className = 'welcomeMessage';
                message.textContent = text;
                message.style.left = (centerX - 150) + 'px';
                message.style.top = (centerY - 50 + index * 60) + 'px';
                message.style.fontSize = '36px';
                document.body.appendChild(message);
                
                setTimeout(() => message.remove(), 3000);
            }, index * 500);
        });
    };

    const fetchNotes = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/notes`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                setNotes(data);
            }
        } catch (err) {
            console.error('Failed to fetch notes:', err);
        }
    };

    const createNote = async () => {
        if (!noteContent.trim()) return;
        
        const wordCount = noteContent.trim().split(/\s+/).length;
        if (wordCount > 50) {
            setError('Note exceeds 50 words limit');
            return;
        }
        
        setError('');
        try {
            const response = await fetch(`${API_BASE_URL}/notes`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content: noteContent })
            });
            
            if (response.ok) {
                setNoteContent('');
                fetchNotes();
            } else {
                const data = await response.json();
                setError(data.detail);
            }
        } catch (err) {
            setError('Failed to create note');
        }
    };

    const deleteNote = async (noteId) => {
        if (!confirm('Delete this note?')) return;
        
        try {
            await fetch(`${API_BASE_URL}/notes/${noteId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            fetchNotes();
        } catch (err) {
            console.error('Failed to delete note:', err);
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setIsLoggedIn(false);
        setNotes([]);
        setEmail('');
        setPassword('');
    };

    const containerStyle = {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        padding: '20px'
    };

    const boxStyle = {
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(86, 156, 214, 0.3)',
        borderRadius: '20px',
        padding: '2rem',
        width: '100%',
        maxWidth: isLoggedIn ? '800px' : '400px',
        color: '#fff'
    };

    const inputStyle = {
        width: '100%',
        padding: '0.75rem',
        marginBottom: '1rem',
        background: 'rgba(255, 255, 255, 0.1)',
        border: '1px solid rgba(86, 156, 214, 0.3)',
        borderRadius: '8px',
        color: '#fff',
        fontSize: '1rem',
        fontFamily: 'Consolas, monospace',
        boxSizing: 'border-box'
    };

    const buttonStyle = {
        width: '100%',
        padding: '0.75rem',
        background: 'linear-gradient(45deg, #569cd6, #4ec9b0)',
        border: 'none',
        borderRadius: '8px',
        color: '#fff',
        fontSize: '1rem',
        fontWeight: 'bold',
        cursor: 'pointer',
        fontFamily: 'Consolas, monospace'
    };

    const noteStyle = {
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(86, 156, 214, 0.3)',
        borderRadius: '12px',
        padding: '1rem',
        marginBottom: '1rem',
        color: '#d4d4d4'
    };

    if (!isLoggedIn) {
        return React.createElement('div', { style: containerStyle },
            React.createElement('div', { style: boxStyle },
                React.createElement('h1', { style: { textAlign: 'center', color: '#4ec9b0', fontSize: '2.5rem', marginBottom: '2rem' } }, 
                    '📝 Note Keeper'),
                React.createElement('h2', { style: { textAlign: 'center', color: '#569cd6', marginBottom: '2rem' } }, 
                    isRegistering ? 'Create Account' : 'Welcome Back'),
                React.createElement('form', { onSubmit: handleAuth },
                    React.createElement('input', {
                        type: 'email',
                        placeholder: 'Email',
                        value: email,
                        onChange: (e) => setEmail(e.target.value),
                        style: inputStyle,
                        required: true
                    }),
                    React.createElement('input', {
                        type: 'password',
                        placeholder: 'Password',
                        value: password,
                        onChange: (e) => setPassword(e.target.value),
                        style: inputStyle,
                        required: true
                    }),
                    React.createElement('button', { 
                        type: 'submit', 
                        style: { ...buttonStyle, opacity: loading ? 0.7 : 1 },
                        disabled: loading
                    }, loading ? 'Please wait...' : (isRegistering ? 'Sign Up' : 'Sign In'))
                ),
                error && React.createElement('p', { style: { color: error.includes('successful') ? '#4ec9b0' : '#dc3545', textAlign: 'center', marginTop: '1rem' } }, error),
                React.createElement('p', { style: { textAlign: 'center', marginTop: '1rem', color: 'rgba(255,255,255,0.7)' } },
                    isRegistering ? 'Already have an account? ' : 'New user? ',
                    React.createElement('a', {
                        href: '#',
                        onClick: (e) => { e.preventDefault(); setIsRegistering(!isRegistering); setError(''); },
                        style: { color: '#4ec9b0', textDecoration: 'none' }
                    }, isRegistering ? 'Sign in' : 'Create account')
                ),
                !isRegistering && React.createElement('div', { 
                    style: { 
                        marginTop: '2rem', 
                        padding: '1rem', 
                        background: 'rgba(78, 201, 176, 0.1)', 
                        borderRadius: '8px',
                        border: '1px solid rgba(78, 201, 176, 0.3)'
                    } 
                },
                    React.createElement('p', { style: { margin: 0, color: '#4ec9b0', textAlign: 'center' } }, 
                        'Test Account:'),
                    React.createElement('p', { style: { margin: '0.5rem 0 0 0', textAlign: 'center', fontSize: '0.9rem' } }, 
                        'Email: test@test.com'),
                    React.createElement('p', { style: { margin: '0.25rem 0 0 0', textAlign: 'center', fontSize: '0.9rem' } }, 
                        'Password: test123')
                )
            )
        );
    }

    const wordCount = noteContent.trim().split(/\s+/).filter(word => word.length > 0).length;

    return React.createElement('div', { style: containerStyle },
        React.createElement('div', { style: boxStyle },
            React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' } },
                React.createElement('h1', { style: { color: '#4ec9b0', fontSize: '2.5rem' } }, '📝 My Notes'),
                React.createElement('button', { 
                    onClick: logout,
                    style: { ...buttonStyle, width: 'auto', padding: '0.5rem 1.5rem', background: '#dc3545' }
                }, 'Logout')
            ),
            React.createElement('div', { style: { color: '#4ec9b0', marginBottom: '2rem', fontSize: '1.2rem' } }, 
                `${notes.length} / 10 notes`),
            React.createElement('div', { style: { marginBottom: '2rem' } },
                React.createElement('h3', { style: { color: '#569cd6', marginBottom: '1rem' } }, 'Create New Note'),
                React.createElement('textarea', {
                    placeholder: 'Write your note here (max 50 words)...',
                    value: noteContent,
                    onChange: (e) => setNoteContent(e.target.value),
                    style: { ...inputStyle, minHeight: '100px', resize: 'vertical' }
                }),
                React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                    React.createElement('span', { style: { color: wordCount > 50 ? '#dc3545' : '#4ec9b0' } }, 
                        `${wordCount} / 50 words`),
                    React.createElement('button', {
                        onClick: createNote,
                        style: { ...buttonStyle, width: 'auto', padding: '0.5rem 2rem' },
                        disabled: notes.length >= 10 || wordCount > 50 || !noteContent.trim()
                    }, 'Save Note')
                )
            ),
            React.createElement('div', null,
                notes.map(note => 
                    React.createElement('div', { key: note.id, style: noteStyle },
                        React.createElement('p', { style: { marginBottom: '0.5rem' } }, note.content),
                        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                            React.createElement('small', { style: { color: '#569cd6' } }, 
                                new Date(note.created_at).toLocaleString()),
                            React.createElement('button', {
                                onClick: () => deleteNote(note.id),
                                style: { 
                                    padding: '0.25rem 1rem',
                                    background: '#dc3545',
                                    border: 'none',
                                    borderRadius: '5px',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem'
                                }
                            }, 'Delete')
                        )
                    )
                )
            ),
            error && React.createElement('p', { style: { color: '#dc3545', textAlign: 'center', marginTop: '1rem' } }, error)
        )
    );
};

// Render the app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(NoteKeeperApp));
