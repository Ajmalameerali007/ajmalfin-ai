
import React, { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { User } from '../types';

const userNames: User[] = ['Ajmal', 'Irfan', 'Shereen'];

const AuthPage: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState<User>('Ajmal');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAuthAction = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (!auth) {
            setError("Firebase is not configured.");
            setLoading(false);
            return;
        }

        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await updateProfile(userCredential.user, { displayName: name });
            }
            // On success, the onAuthStateChanged listener in AppContext will handle navigation.
        } catch (err) {
            let errorCode = 'unknown';
            if (err && typeof err === 'object' && 'code' in err) {
                errorCode = (err as { code: string }).code;
            }

            switch (errorCode) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                    setError('Invalid email or password.');
                    break;
                case 'auth/email-already-in-use':
                    setError('An account with this email already exists.');
                    break;
                case 'auth/weak-password':
                    setError('Password should be at least 6 characters.');
                    break;
                default:
                    setError('An error occurred. Please try again.');
            }
            console.error("Authentication error:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-screen h-screen flex flex-col items-center justify-center bg-dark-bg text-dark-text p-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-dark-text">
                        AjmalFin <span className="text-accent-lemon">AI</span>
                    </h1>
                    <p className="text-dark-subtext">Your Personal Finance Assistant</p>
                </div>
                <form onSubmit={handleAuthAction} className="bg-dark-card p-8 rounded-2xl shadow-2xl space-y-6">
                    <h2 className="text-2xl font-bold text-center text-white">{isLogin ? 'Sign In' : 'Create Account'}</h2>
                     {!isLogin && (
                        <div>
                            <label className="block text-sm font-medium text-dark-subtext">Your Name</label>
                            <select
                                value={name}
                                onChange={(e) => setName(e.target.value as User)}
                                className="mt-1 w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-dark-text"
                            >
                                {userNames.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-dark-subtext">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-1 w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-dark-text"
                            required
                            autoComplete="email"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-dark-subtext">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-dark-text"
                            required
                            autoComplete={isLogin ? "current-password" : "new-password"}
                        />
                    </div>
                    {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                    <button type="submit" disabled={loading} className="w-full px-6 py-3 font-bold text-black bg-accent-lemon rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed">
                        {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
                    </button>
                    <p className="text-center text-sm">
                        <button type="button" onClick={() => { setIsLogin(!isLogin); setError(''); }} className="font-medium text-accent-lemon hover:underline">
                            {isLogin ? "Need an account? Sign Up" : "Already have an account? Sign In"}
                        </button>
                    </p>
                </form>
            </div>
        </div>
    );
};

export default AuthPage;