"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';

export interface User {
    id: string;
    username?: string;
    email?: string;
    avatar?: string;
    gender?: string;
    interests: string[];
    vibeCharacteristics?: {
        nightOwl: boolean;
        texter: boolean;
    };
    vibeScore?: number;
    createdAt?: string;
}

interface UserContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    register: (email: string, username: string, password: string) => Promise<void>;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    updateProfile: (profile: Partial<User>) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
    const [user, setUserState] = useState<User | null>(null);
    const [token, setTokenState] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load token and fetch user on mount
    useEffect(() => {
        const initializeAuth = async () => {
            try {
                const savedToken = localStorage.getItem('vibelink_token');
                if (savedToken) {
                    setTokenState(savedToken);
                    // Fetch current user
                    const currentUser = await apiClient.getCurrentUser(savedToken);
                    setUserState(currentUser);
                }
            } catch (error) {
                console.error('Failed to restore session:', error);
                // Clear invalid token
                localStorage.removeItem('vibelink_token');
                setTokenState(null);
            } finally {
                setIsLoading(false);
            }
        };

        initializeAuth();
    }, []);

    const register = async (email: string, username: string, password: string) => {
        try {
            const response = await apiClient.register({ email, username, password });
            const newToken = response.token;
            const newUser = response.user;

            setTokenState(newToken);
            setUserState(newUser);
            localStorage.setItem('vibelink_token', newToken);
        } catch (error) {
            console.error('Registration failed:', error);
            throw error;
        }
    };

    const login = async (email: string, password: string) => {
        try {
            const response = await apiClient.login({ email, password });
            const newToken = response.token;
            const newUser = response.user;

            setTokenState(newToken);
            setUserState(newUser);
            localStorage.setItem('vibelink_token', newToken);
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    };

    const logout = () => {
        setUserState(null);
        setTokenState(null);
        localStorage.removeItem('vibelink_token');
    };

    const updateProfile = async (profile: Partial<User>) => {
        if (!token) throw new Error('Not authenticated');
        try {
            const updated = await apiClient.updateProfile(token, profile);
            setUserState(updated);
        } catch (error) {
            console.error('Profile update failed:', error);
            throw error;
        }
    };

    return (
        <UserContext.Provider
            value={{
                user,
                token,
                isLoading,
                isAuthenticated: !!token && !!user,
                register,
                login,
                logout,
                updateProfile,
            }}
        >
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (!context) throw new Error("useUser must be used within a UserProvider");
    return context;
}
