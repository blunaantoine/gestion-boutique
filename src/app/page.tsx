'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAppStore, Product, Sale } from '@/lib/store';
import { formatPrice } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { BarcodeScanner } from '@/components/barcode-scanner';
import { ReceiptPDF, generateReceiptData } from '@/components/receipt-pdf';
import { pdf } from '@react-pdf/renderer';
import {
  Store, Package, ShoppingCart, BarChart3, LogOut, Plus, Minus, Trash2,
  Search, Barcode, TrendingUp, Users, CreditCard,
  Phone, Lock, User, Building2, ClipboardList,
  PieChart, AlertTriangle, CheckCircle, Image as ImageIcon, X, Upload, Camera, Scan, KeyRound, Eye, EyeOff, Printer, Download, FileText, Bluetooth
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, LineChart, Line, Legend } from 'recharts';

// Composant champ mot de passe avec visibilité
function PasswordInput({ 
  id, 
  name, 
  placeholder, 
  required = true,
  showPassword, 
  onToggle 
}: { 
  id: string; 
  name: string; 
  placeholder?: string;
  required?: boolean;
  showPassword: boolean; 
  onToggle: () => void;
}) {
  return (
    <div className="relative">
      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
      <Input 
        id={id} 
        name={name} 
        type={showPassword ? "text" : "password"} 
        className="pl-10 pr-10" 
        placeholder={placeholder}
        required={required}
        minLength={4}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
      >
        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

// Composant Authentification
function AuthScreen() {
  const [userType, setUserType] = useState<'employee' | 'owner' | null>(null);
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetStep, setResetStep] = useState<'verify' | 'reset'>('verify');
  const [verifiedUser, setVerifiedUser] = useState<{ phone: string; name: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { setUser } = useAppStore();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);

    // Ajouter le rôle automatiquement selon le type d'utilisateur
    if (userType === 'employee') {
      data.role = 'EMPLOYEE';
    } else {
      data.role = 'OWNER';
    }

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Échec de l\'authentification');
      }

      setUser(result.user);
      toast({ title: 'Succès', description: isLogin ? 'Bienvenue !' : 'Compte créé avec succès !' });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Échec de l\'authentification',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResetLoading(true);

    const formData = new FormData(e.currentTarget);
    const phone = formData.get('resetPhone') as string;
    const name = formData.get('resetName') as string;

    try {
      // Verify user exists with phone and name
      const res = await fetch(`/api/auth/verify?phone=${encodeURIComponent(phone)}&name=${encodeURIComponent(name)}`);
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Utilisateur non trouvé');
      }

      setVerifiedUser({ phone, name: result.user.name });
      setResetStep('reset');
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Vérification échouée',
        variant: 'destructive',
      });
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResetLoading(true);

    const formData = new FormData(e.currentTarget);
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Erreur',
        description: 'Les mots de passe ne correspondent pas',
        variant: 'destructive',
      });
      setResetLoading(false);
      return;
    }

    if (newPassword.length < 4) {
      toast({
        title: 'Erreur',
        description: 'Le mot de passe doit contenir au moins 4 caractères',
        variant: 'destructive',
      });
      setResetLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: verifiedUser?.phone,
          name: verifiedUser?.name,
          newPassword,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Erreur lors de la réinitialisation');
      }

      toast({ title: 'Succès', description: 'Mot de passe réinitialisé avec succès !' });
      setResetDialogOpen(false);
      setResetStep('verify');
      setVerifiedUser(null);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur lors de la réinitialisation',
        variant: 'destructive',
      });
    } finally {
      setResetLoading(false);
    }
  };

  const closeResetDialog = () => {
    setResetDialogOpen(false);
    setResetStep('verify');
    setVerifiedUser(null);
  };

  // Écran de sélection du type d'utilisateur
  if (!userType) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <Card className="w-full max-w-lg border-0 shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Store className="w-10 h-10 text-white" />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold">Gestion de Boutique</CardTitle>
              <CardDescription className="text-base mt-2">Bienvenue ! Sélectionnez votre espace de connexion</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Option Gérant */}
            <button
              onClick={() => setUserType('owner')}
              className="w-full p-6 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all group text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <User className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-emerald-600 dark:text-emerald-400">Espace Gérant</h3>
                  <p className="text-sm text-muted-foreground">Accès complet : produits, ventes, rapports, employés</p>
                </div>
                <div className="text-emerald-500 group-hover:translate-x-1 transition-transform">→</div>
              </div>
            </button>

            {/* Option Employé */}
            <button
              onClick={() => setUserType('employee')}
              className="w-full p-6 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-orange-500 dark:hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-all group text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-orange-600 dark:text-orange-400">Espace Employé</h3>
                  <p className="text-sm text-muted-foreground">Accès limité : caisse et historique des ventes</p>
                </div>
                <div className="text-orange-500 group-hover:translate-x-1 transition-transform">→</div>
              </div>
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Background différent selon le type d'utilisateur
  const backgroundClass = userType === 'owner' 
    ? 'bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900'
    : 'bg-gradient-to-br from-orange-900 via-orange-800 to-amber-900';

  return (
    <div className={`min-h-screen flex items-center justify-center ${backgroundClass} p-4`}>
      <Card className="w-full max-w-md border-0 shadow-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4 relative">
          <button
            onClick={() => { setUserType(null); setIsLogin(true); }}
            className="absolute top-0 left-0 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            ← Retour
          </button>
          <div className={`mx-auto w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg ${
            userType === 'owner' 
              ? 'bg-gradient-to-br from-emerald-500 to-teal-600' 
              : 'bg-gradient-to-br from-orange-500 to-amber-600'
          }`}>
            {userType === 'owner' ? (
              <User className="w-10 h-10 text-white" />
            ) : (
              <Users className="w-10 h-10 text-white" />
            )}
          </div>
          <div>
            <CardTitle className={`text-2xl font-bold ${userType === 'owner' ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'}`}>
              {userType === 'owner' ? 'Espace Gérant' : 'Espace Employé'}
            </CardTitle>
            <CardDescription className="text-base mt-1">
              {userType === 'owner' 
                ? 'Gérez votre boutique et vos employés' 
                : 'Effectuez des ventes et consultez l\'historique'}
            </CardDescription>
          </div>
          {/* Badge distinctif */}
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
            userType === 'owner'
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
              : 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300'
          }`}>
            {userType === 'owner' ? (
              <>
                <User className="w-3 h-3" />
                Compte Propriétaire
              </>
            ) : (
              <>
                <Users className="w-3 h-3" />
                Compte Employé
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Les employés peuvent seulement se connecter */}
          {userType === 'employee' ? (
            <div className="space-y-4">
              {/* Message info pour employé */}
              <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800">
                <p className="text-sm text-orange-700 dark:text-orange-400 text-center">
                  👋 Connectez-vous avec vos identifiants fournis par le gérant
                </p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Numéro de téléphone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="phone" name="phone" placeholder="+221 77 123 45 67" className="pl-10" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="password" 
                      name="password" 
                      type={showPassword ? "text" : "password"} 
                      className="pl-10 pr-10" 
                      required 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold" disabled={loading}>
                  {loading ? 'Connexion...' : 'Se connecter'}
                </Button>

                <Button type="button" variant="link" className="w-full text-sm text-muted-foreground" onClick={() => setResetDialogOpen(true)}>
                  Mot de passe oublié ?
                </Button>
              </form>
            </div>
          ) : (
            /* Formulaire Gérant avec connexion/inscription */
            <div className="space-y-4">
              {/* Message info pour gérant */}
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <p className="text-sm text-emerald-700 dark:text-emerald-400 text-center">
                  💼 Accès complet à toutes les fonctionnalités de gestion
                </p>
              </div>
              <Tabs value={isLogin ? 'login' : 'register'} onValueChange={(v) => setIsLogin(v === 'login')}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">Connexion</TabsTrigger>
                  <TabsTrigger value="register">Inscription</TabsTrigger>
                </TabsList>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {!isLogin && (
                    <div className="space-y-2">
                      <Label htmlFor="name">Nom complet</Label>
                      <Input id="name" name="name" placeholder="Jean Dupont" required={!isLogin} />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="phone">Numéro de téléphone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="phone" name="phone" placeholder="+221 77 123 45 67" className="pl-10" required />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Mot de passe</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="password" 
                        name="password" 
                        type={showPassword ? "text" : "password"} 
                        className="pl-10 pr-10" 
                        required 
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {!isLogin && (
                    <div className="space-y-2">
                      <Label htmlFor="shopName">Nom de la boutique</Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input id="shopName" name="shopName" placeholder="Ma Boutique" className="pl-10" />
                      </div>
                    </div>
                  )}

                  <Button type="submit" className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold" disabled={loading}>
                    {loading ? 'Veuillez patienter...' : isLogin ? 'Se connecter' : 'Créer mon compte'}
                  </Button>

                  {isLogin && (
                    <Button type="button" variant="link" className="w-full text-sm text-muted-foreground" onClick={() => setResetDialogOpen(true)}>
                      Mot de passe oublié ?
                    </Button>
                  )}
                </form>
              </Tabs>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogue réinitialisation mot de passe */}
      <Dialog open={resetDialogOpen} onOpenChange={(open) => { if (!open) closeResetDialog(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Réinitialiser le mot de passe
            </DialogTitle>
            <DialogDescription>
              {resetStep === 'verify' 
                ? 'Entrez votre numéro de téléphone et votre nom pour vérifier votre identité.'
                : `Compte vérifié : ${verifiedUser?.name}`
              }
            </DialogDescription>
          </DialogHeader>

          {resetStep === 'verify' ? (
            <form onSubmit={handleVerifyUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="resetPhone">Numéro de téléphone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="resetPhone" name="resetPhone" placeholder="+221 77 123 45 67" className="pl-10" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="resetName">Nom complet</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="resetName" name="resetName" placeholder="Votre nom" className="pl-10" required />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={closeResetDialog} className="flex-1">
                  Annuler
                </Button>
                <Button type="submit" className="flex-1" disabled={resetLoading}>
                  {resetLoading ? 'Vérification...' : 'Vérifier'}
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <p className="text-sm text-emerald-700 dark:text-emerald-400">
                  ✓ Identité vérifiée pour <strong>{verifiedUser?.name}</strong>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                <PasswordInput 
                  id="newPassword" 
                  name="newPassword" 
                  placeholder="Minimum 4 caractères"
                  showPassword={showNewPassword} 
                  onToggle={() => setShowNewPassword(!showNewPassword)} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <PasswordInput 
                  id="confirmPassword" 
                  name="confirmPassword" 
                  placeholder="Confirmez le mot de passe"
                  showPassword={showConfirmPassword} 
                  onToggle={() => setShowConfirmPassword(!showConfirmPassword)} 
                />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setResetStep('verify')} className="flex-1">
                  Retour
                </Button>
                <Button type="submit" className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600" disabled={resetLoading}>
                  {resetLoading ? 'Réinitialisation...' : 'Réinitialiser'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Composant Tableau de bord
function Dashboard() {
  const { user } = useAppStore();
  const isOwner = user?.role === 'OWNER';
  const [stats, setStats] = useState({
    totalSales: 0,
    totalRevenue: 0,
    totalProducts: 0,
    lowStockProducts: 0,
  });
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [salesByHour, setSalesByHour] = useState<Record<number, number>>({});
  const [topProducts, setTopProducts] = useState<{ name: string; quantity: number; revenue: number }[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [dailyRes, productsRes, salesRes] = await Promise.all([
          fetch('/api/reports/daily'),
          fetch('/api/products?limit=100'),
          fetch('/api/sales?limit=5'),
        ]);

        const dailyData = await dailyRes.json();
        const productsData = await productsRes.json();
        const salesData = await salesRes.json();

        setStats({
          totalSales: dailyData.summary?.totalSales || 0,
          totalRevenue: dailyData.summary?.totalRevenue || 0,
          totalProducts: productsData.pagination?.total || 0,
          lowStockProducts: productsData.products?.filter((p: Product) => p.stockQuantity <= 5).length || 0,
        });

        setRecentSales(salesData.sales || []);
        setSalesByHour(dailyData.salesByHour || {});
        setTopProducts(dailyData.topProducts || []);
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
      }
    };

    fetchDashboardData();
  }, []);

  const hourlyData = Object.entries(salesByHour).map(([hour, amount]) => ({
    hour: `${hour}h`,
    amount,
  }));

  const COLORS = ['#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
          <p className="text-muted-foreground">
            Bienvenue, {user?.name} ! Voici l&apos;aperçu de votre boutique.
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {user?.ownedShop?.name || user?.shop?.name || 'Aucune boutique'}
        </Badge>
      </div>

      {/* Cartes statistiques */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ventes du jour</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSales}</div>
            {isOwner && (
              <p className="text-xs text-muted-foreground">
                {formatPrice(stats.totalRevenue)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-teal-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Produits</CardTitle>
            <Package className="h-4 w-4 text-teal-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">Articles en stock</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-cyan-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Stock faible</CardTitle>
            <AlertTriangle className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lowStockProducts}</div>
            <p className="text-xs text-muted-foreground">Moins de 5 unités</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-sky-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Stock total</CardTitle>
            <Package className="h-4 w-4 text-sky-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts + stats.lowStockProducts}</div>
            <p className="text-xs text-muted-foreground">Articles disponibles</p>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques - Visible uniquement pour le propriétaire */}
      {isOwner && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Ventes par heure</CardTitle>
              <CardDescription>Répartition des ventes d&apos;aujourd&apos;hui</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData.filter((_, i) => i % 2 === 0)}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="hour" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Produits</CardTitle>
              <CardDescription>Meilleures ventes du jour</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={topProducts.slice(0, 5)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="quantity"
                      nameKey="name"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {topProducts.slice(0, 5).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Ventes récentes */}
      <Card>
        <CardHeader>
          <CardTitle>Ventes récentes</CardTitle>
          <CardDescription>Dernières transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Heure</TableHead>
                <TableHead>Articles</TableHead>
                <TableHead>Paiement</TableHead>
                {isOwner && <TableHead className="text-right">Montant</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentSales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isOwner ? 4 : 3} className="text-center text-muted-foreground">
                    Aucune vente aujourd&apos;hui
                  </TableCell>
                </TableRow>
              ) : (
                recentSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>
                      {new Date(sale.createdAt).toLocaleTimeString('fr-FR')}
                    </TableCell>
                    <TableCell>{sale.items?.length || 0} articles</TableCell>
                    <TableCell>
                      <Badge variant={sale.paymentMethod === 'CASH' ? 'default' : 'secondary'}>
                        {sale.paymentMethod === 'CASH' ? 'Espèces' : 'Mobile Money'}
                      </Badge>
                    </TableCell>
                    {isOwner && (
                      <TableCell className="text-right font-medium">
                        {formatPrice(sale.totalAmount)}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// Composant Gestion des Produits
function ProductsManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productImage, setProductImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);

  const handleBarcodeScan = useCallback(async (barcode: string) => {
    setScannedBarcode(barcode);
    setSearch(barcode);
    toast({ title: 'Code-barres scanné', description: `Code: ${barcode}` });
    
    const res = await fetch(`/api/products?barcode=${barcode}`);
    const data = await res.json();
    
    if (data.products && data.products.length > 0) {
      const product = data.products[0];
      setEditingProduct(product);
      setProductImage(product.imageUrl);
      setDialogOpen(true);
      toast({ title: 'Produit trouvé', description: product.name });
    } else {
      setEditingProduct(null);
      setProductImage(null);
      setDialogOpen(true);
      toast({ title: 'Nouveau produit', description: 'Ce code-barres n\'existe pas. Créez un nouveau produit.' });
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch(`/api/products?search=${search}`);
      const data = await res.json();
      setProducts(data.products || []);
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de charger les produits', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Échec du téléchargement');

      setProductImage(data.imageUrl);
      toast({ title: 'Succès', description: 'Image téléchargée avec succès' });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de télécharger l\'image', variant: 'destructive' });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);

    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          barcode: data.barcode || null,
          purchasePrice: parseFloat(data.purchasePrice as string),
          salePrice: parseFloat(data.salePrice as string),
          stockQuantity: parseInt(data.stockQuantity as string) || 0,
          category: data.category || null,
          description: data.description || null,
          imageUrl: productImage,
        }),
      });

      if (!res.ok) throw new Error('Impossible de sauvegarder le produit');

      toast({ title: 'Succès', description: `Produit ${editingProduct ? 'modifié' : 'créé'} avec succès` });
      setDialogOpen(false);
      setEditingProduct(null);
      setProductImage(null);
      setScannedBarcode(null);
      fetchProducts();
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder le produit', variant: 'destructive' });
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) return;

    try {
      await fetch(`/api/products/${id}`, { method: 'DELETE' });
      toast({ title: 'Succès', description: 'Produit supprimé' });
      fetchProducts();
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de supprimer le produit', variant: 'destructive' });
    }
  };

  const handleStockUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const formData = new FormData(e.currentTarget);
    const type = formData.get('type') as string;
    const quantity = parseInt(formData.get('quantity') as string);
    const reason = formData.get('reason') as string;

    try {
      const res = await fetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct.id,
          type,
          quantity: type === 'ADJUSTMENT' ? quantity : Math.abs(quantity),
          reason,
        }),
      });

      if (!res.ok) throw new Error('Impossible de mettre à jour le stock');

      toast({ title: 'Succès', description: 'Stock mis à jour avec succès' });
      setStockDialogOpen(false);
      setSelectedProduct(null);
      fetchProducts();
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de mettre à jour le stock', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Produits</h1>
          <p className="text-muted-foreground">Gérez votre inventaire</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { 
          setDialogOpen(open); 
          if (!open) {
            setEditingProduct(null);
            setProductImage(null);
            setScannedBarcode(null);
          } else if (editingProduct) {
            setProductImage(editingProduct.imageUrl);
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-emerald-500 to-teal-600">
              <Plus className="mr-2 h-4 w-4" /> Ajouter un produit
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingProduct ? 'Modifier le produit' : 'Ajouter un produit'}</DialogTitle>
              <DialogDescription>
                {editingProduct ? 'Mettre à jour les informations du produit' : 'Ajouter un nouveau produit à votre inventaire'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveProduct} className="space-y-4">
              {/* Image */}
              <div className="space-y-2">
                <Label>Image du produit</Label>
                <div className="flex items-center gap-4">
                  <div className="relative w-24 h-24 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden flex items-center justify-center bg-gray-50 dark:bg-gray-800">
                    {productImage ? (
                      <>
                        <img src={productImage} alt="Produit" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setProductImage(null)}
                          className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <ImageIcon className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploadingImage}
                      />
                      <div className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <Upload className="w-4 h-4" />
                        <span>{uploadingImage ? 'Téléchargement...' : 'Télécharger une image'}</span>
                      </div>
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">
                      JPEG, PNG, GIF ou WebP. Max 5 Mo.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="name">Nom du produit *</Label>
                  <Input id="name" name="name" defaultValue={editingProduct?.name} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="barcode">Code-barres</Label>
                  <Input id="barcode" name="barcode" defaultValue={editingProduct?.barcode || scannedBarcode || ''} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Catégorie</Label>
                  <Input id="category" name="category" defaultValue={editingProduct?.category || ''} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchasePrice">Prix d&apos;achat *</Label>
                  <Input id="purchasePrice" name="purchasePrice" type="number" step="0.01" defaultValue={editingProduct?.purchasePrice} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salePrice">Prix de vente *</Label>
                  <Input id="salePrice" name="salePrice" type="number" step="0.01" defaultValue={editingProduct?.salePrice} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stockQuantity">Quantité en stock</Label>
                  <Input id="stockQuantity" name="stockQuantity" type="number" defaultValue={editingProduct?.stockQuantity || 0} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input id="description" name="description" defaultValue={editingProduct?.description || ''} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
                <Button type="submit" disabled={uploadingImage}>{editingProduct ? 'Modifier' : 'Créer'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou code-barres..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" onClick={() => setScannerOpen(true)} className="shrink-0">
          <Camera className="h-4 w-4 mr-2" />
          Scanner
        </Button>
      </div>

      <BarcodeScanner
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleBarcodeScan}
      />

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <Card key={product.id} className={`overflow-hidden ${product.stockQuantity <= 5 ? 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20' : ''}`}>
              <div className="aspect-video w-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 relative">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-gray-400" />
                  </div>
                )}
                {product.category && (
                  <Badge variant="secondary" className="absolute top-2 right-2">
                    {product.category}
                  </Badge>
                )}
              </div>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{product.name}</CardTitle>
                    <CardDescription>
                      {product.barcode && (
                        <span className="flex items-center gap-1">
                          <Barcode className="h-3 w-3" /> {product.barcode}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Coût:</span>
                  <span>{formatPrice(product.purchasePrice)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Prix:</span>
                  <span className="font-semibold text-emerald-600">{formatPrice(product.salePrice)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Stock:</span>
                  <Badge variant={product.stockQuantity <= 5 ? 'destructive' : 'default'}>
                    {product.stockQuantity} unités
                  </Badge>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => { setSelectedProduct(product); setStockDialogOpen(true); }}>
                    <Package className="h-3 w-3 mr-1" /> Stock
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditingProduct(product); setProductImage(product.imageUrl); setDialogOpen(true); }}>
                    Modifier
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDeleteProduct(product.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogue mise à jour stock */}
      <Dialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mettre à jour le stock</DialogTitle>
            <DialogDescription>
              Ajuster le stock pour {selectedProduct?.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleStockUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label>Type de mouvement</Label>
              <Select name="type" defaultValue="IN">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">Entrée (+)</SelectItem>
                  <SelectItem value="OUT">Sortie (-)</SelectItem>
                  <SelectItem value="ADJUSTMENT">Ajustement (définir exact)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantité</Label>
              <Input id="quantity" name="quantity" type="number" min="0" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Raison</Label>
              <Input id="reason" name="reason" placeholder="Raison optionnelle" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setStockDialogOpen(false)}>Annuler</Button>
              <Button type="submit">Mettre à jour</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Composant POS/Caisse
function POSSystem() {
  const { cart, addToCart, removeFromCart, updateCartQuantity, clearCart, getCartTotal, user } = useAppStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'MOBILE_MONEY'>('CASH');
  const [customerName, setCustomerName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [lastSale, setLastSale] = useState<{
    id: string;
    createdAt: string;
    totalAmount: number;
    paymentMethod: string;
    customerName?: string | null;
    items?: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      product?: { name: string } | null;
    }>;
  } | null>(null);
  const [receiptHtml, setReceiptHtml] = useState<string>('');
  const receiptRef = useRef<HTMLDivElement>(null);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    fetch('/api/products?limit=100')
      .then((res) => res.json())
      .then((data) => setProducts(data.products || []));
  }, []);

  const handleBarcodeScan = useCallback(async (barcode: string) => {
    setSearch(barcode);
    toast({ title: 'Code-barres scanné', description: `Code: ${barcode}` });
    
    const product = products.find(p => p.barcode === barcode);
    
    if (product) {
      if (product.stockQuantity > 0) {
        addToCart(product);
        toast({ title: 'Produit ajouté', description: `${product.name} ajouté au panier` });
      } else {
        toast({ title: 'Stock épuisé', description: `${product.name} n'est plus en stock`, variant: 'destructive' });
      }
    } else {
      const res = await fetch(`/api/products?barcode=${barcode}`);
      const data = await res.json();
      
      if (data.products && data.products.length > 0) {
        const foundProduct = data.products[0];
        if (foundProduct.stockQuantity > 0) {
          addToCart(foundProduct);
          toast({ title: 'Produit ajouté', description: `${foundProduct.name} ajouté au panier` });
        } else {
          toast({ title: 'Stock épuisé', description: `${foundProduct.name} n'est plus en stock`, variant: 'destructive' });
        }
      } else {
        toast({ title: 'Produit non trouvé', description: `Aucun produit avec le code: ${barcode}`, variant: 'destructive' });
      }
    }
  }, [products, addToCart]);

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode && p.barcode.includes(search))
  );

  // Générer le HTML du reçu pour l'impression
  const generateReceiptHtml = (saleData: typeof lastSale) => {
    if (!saleData) return '';
    const shopName = user?.ownedShop?.name || user?.shop?.name || 'Ma Boutique';
    const date = new Date(saleData.createdAt);
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Reçu ${saleData.id.slice(-8).toUpperCase()}</title>
        <style>
          @page { size: 80mm auto; margin: 2mm; }
          body { 
            font-family: 'Courier New', monospace; 
            font-size: 12px; 
            width: 75mm;
            padding: 5mm;
            margin: 0;
          }
          .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; }
          .shop-name { font-size: 16px; font-weight: bold; }
          .title { text-align: center; font-weight: bold; font-size: 14px; margin: 10px 0; }
          .info-row { display: flex; justify-content: space-between; margin: 3px 0; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .items-header { display: flex; justify-content: space-between; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 5px; margin-bottom: 5px; }
          .item-row { display: flex; justify-content: space-between; margin: 4px 0; }
          .item-name { flex: 2; }
          .item-qty { width: 40px; text-align: center; }
          .item-price { width: 70px; text-align: right; }
          .total-row { display: flex; justify-content: space-between; margin: 5px 0; }
          .grand-total { display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; border-top: 1px solid #000; padding-top: 5px; margin-top: 5px; }
          .footer { text-align: center; margin-top: 15px; font-size: 10px; }
          .thank-you { font-weight: bold; margin-bottom: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="shop-name">${shopName}</div>
        </div>
        <div class="title">REÇU DE VENTE</div>
        <div class="info-row"><span>N°: ${saleData.id.slice(-8).toUpperCase()}</span><span>Date: ${date.toLocaleDateString('fr-FR')}</span></div>
        <div class="info-row"><span>Heure: ${date.toLocaleTimeString('fr-FR')}</span><span>Vendeur: ${user?.name || 'N/A'}</span></div>
        ${saleData.customerName ? `<div class="info-row"><span>Client: ${saleData.customerName}</span></div>` : ''}
        <div class="divider"></div>
        <div class="items-header">
          <span class="item-name">Article</span>
          <span class="item-qty">Qté</span>
          <span class="item-price">Prix</span>
        </div>
        ${(saleData.items || []).map(item => `
          <div class="item-row">
            <span class="item-name">${item.product?.name || 'Produit'}</span>
            <span class="item-qty">x${item.quantity}</span>
            <span class="item-price">${formatPrice(item.quantity * item.unitPrice)}</span>
          </div>
        `).join('')}
        <div class="divider"></div>
        <div class="total-row"><span>Sous-total:</span><span>${formatPrice(saleData.totalAmount)}</span></div>
        <div class="total-row"><span>Paiement:</span><span>${saleData.paymentMethod === 'CASH' ? 'Espèces' : 'Mobile Money'}</span></div>
        <div class="grand-total"><span>TOTAL:</span><span>${formatPrice(saleData.totalAmount)}</span></div>
        <div class="footer">
          <div class="thank-you">Merci de votre visite !</div>
          <div>À bientôt</div>
        </div>
      </body>
      </html>
    `;
  };

  // Télécharger le PDF
  const handleDownloadPDF = async () => {
    if (!lastSale) return;
    
    const shopName = user?.ownedShop?.name || user?.shop?.name || 'Ma Boutique';
    const receiptData = generateReceiptData(lastSale, shopName, user?.name || 'Vendeur');
    
    const blob = await pdf(<ReceiptPDF data={receiptData} />).toBlob();
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `recu-${lastSale.id.slice(-8).toUpperCase()}.pdf`;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({ title: 'Téléchargement', description: 'Le reçu PDF a été téléchargé' });
  };

  // Imprimer via navigateur (supporte Bluetooth, USB, réseau)
  const handlePrint = () => {
    if (!lastSale) return;
    
    const html = generateReceiptHtml(lastSale);
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  // Imprimer directement avec l'API de navigateur
  const handleDirectPrint = async () => {
    if (!lastSale) return;
    
    try {
      // Créer une fenêtre de prévisualisation pour l'impression
      const html = generateReceiptHtml(lastSale);
      const printWindow = window.open('', '_blank', 'width=320,height=500');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        
        // Attendre le chargement puis imprimer automatiquement
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
            // Fermer après impression (optionnel)
            // printWindow.close();
          }, 300);
        };
      }
      
      toast({ 
        title: 'Impression', 
        description: 'Sélectionnez votre imprimante (Bluetooth, USB ou réseau)' 
      });
    } catch {
      toast({ 
        title: 'Erreur', 
        description: 'Impossible d\'imprimer. Vérifiez votre imprimante.', 
        variant: 'destructive' 
      });
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast({ title: 'Erreur', description: 'Le panier est vide', variant: 'destructive' });
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
          })),
          paymentMethod,
          customerName: customerName || null,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Impossible de traiter la vente');
      }

      const saleResult = await res.json();
      
      // Sauvegarder la vente pour le reçu
      setLastSale(saleResult.sale);
      setReceiptHtml(generateReceiptHtml(saleResult.sale));
      
      toast({ title: 'Succès', description: 'Vente effectuée avec succès !' });
      clearCart();
      setCustomerName('');
      setCartOpen(false);
      
      // Afficher le dialogue de reçu
      setReceiptDialogOpen(true);
      
      // Rafraîchir les produits
      const data = await (await fetch('/api/products?limit=100')).json();
      setProducts(data.products || []);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible de traiter la vente',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col space-y-4 relative">
      {/* Barre de recherche et boutons */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher ou scanner..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" onClick={() => setScannerOpen(true)} className="shrink-0">
          <Scan className="h-4 w-4 mr-2" />
          Scanner
        </Button>
      </div>

      <BarcodeScanner
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleBarcodeScan}
      />

      {/* Grille produits */}
      <ScrollArea className="flex-1">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 pr-4 pb-20">
          {filteredProducts.map((product) => (
            <Card
              key={product.id}
              className={`cursor-pointer hover:shadow-md transition-shadow ${product.stockQuantity <= 0 ? 'opacity-50' : ''}`}
              onClick={() => {
                if (product.stockQuantity > 0) {
                  addToCart(product);
                }
              }}
            >
              <CardContent className="p-3">
                <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <p className="font-medium text-sm truncate">{product.name}</p>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-emerald-600 font-bold">{formatPrice(product.salePrice)}</span>
                  <Badge variant={product.stockQuantity <= 5 ? 'destructive' : 'secondary'} className="text-xs">
                    {product.stockQuantity}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {/* Bulle flottante Panier - Toujours visible */}
      <Popover open={cartOpen} onOpenChange={setCartOpen}>
        <PopoverTrigger asChild>
          <div className="fixed bottom-6 right-6 z-50 cursor-pointer">
            <div className="relative">
              <div className="h-16 w-16 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 shadow-lg flex items-center justify-center hover:scale-110 transition-transform">
                <ShoppingCart className="h-7 w-7 text-white" />
              </div>
              {cartItemCount > 0 && (
                <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center animate-pulse">
                  {cartItemCount}
                </div>
              )}
              {cart.length > 0 && (
                <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                  <span className="text-sm font-bold text-emerald-600 bg-white dark:bg-slate-800 px-2 py-1 rounded-full shadow">
                    {formatPrice(getCartTotal())}
                  </span>
                </div>
              )}
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-96 p-0" side="top" align="end" sideOffset={20}>
          <div className="p-4 border-b bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-t-lg">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2 text-lg">
                <ShoppingCart className="h-5 w-5" /> Panier
              </h3>
              {cart.length > 0 && (
                <Button size="sm" variant="ghost" onClick={clearCart} className="text-white hover:bg-white/20">
                  Vider
                </Button>
              )}
            </div>
          </div>
          <ScrollArea className="max-h-80 p-4">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mb-2" />
                <p>Le panier est vide</p>
                <p className="text-xs mt-1">Cliquez sur un produit pour l'ajouter</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                    <div className="w-14 h-14 rounded-md overflow-hidden bg-slate-200 dark:bg-slate-700 flex-shrink-0">
                      {item.product.imageUrl ? (
                        <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.product.name}</p>
                      <p className="text-xs text-muted-foreground">{formatPrice(item.product.salePrice)} / unité</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)} disabled={item.quantity >= item.product.stockQuantity}>
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:bg-red-100" onClick={() => removeFromCart(item.product.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <Separator />

          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">Nom du client (optionnel)</Label>
              <Input id="customerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Client passage" />
            </div>

            <div className="space-y-2">
              <Label>Mode de paiement</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button variant={paymentMethod === 'CASH' ? 'default' : 'outline'} className={paymentMethod === 'CASH' ? 'bg-emerald-500 hover:bg-emerald-600' : ''} onClick={() => setPaymentMethod('CASH')}>
                  Espèces
                </Button>
                <Button variant={paymentMethod === 'MOBILE_MONEY' ? 'default' : 'outline'} className={paymentMethod === 'MOBILE_MONEY' ? 'bg-emerald-500 hover:bg-emerald-600' : ''} onClick={() => setPaymentMethod('MOBILE_MONEY')}>
                  <CreditCard className="h-4 w-4 mr-1" /> Mobile
                </Button>
              </div>
            </div>

            <div className="flex justify-between items-center text-xl font-bold">
              <span>Total:</span>
              <span className="text-emerald-600">{formatPrice(getCartTotal())}</span>
            </div>

            <Button className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700" size="lg" onClick={handleCheckout} disabled={cart.length === 0 || processing}>
              {processing ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
              ) : (
                <CheckCircle className="h-5 w-5 mr-2" />
              )}
              Valider la vente
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Dialogue Reçu après vente */}
      <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <CheckCircle className="h-5 w-5" />
              Vente enregistrée !
            </DialogTitle>
            <DialogDescription>
              Reçu N° {lastSale?.id.slice(-8).toUpperCase()}
            </DialogDescription>
          </DialogHeader>
          
          {/* Aperçu du reçu */}
          <div className="bg-white dark:bg-slate-900 border rounded-lg p-4 font-mono text-sm" ref={receiptRef}>
            <div className="text-center border-b border-dashed pb-3 mb-3">
              <div className="font-bold text-lg">{user?.ownedShop?.name || user?.shop?.name || 'Ma Boutique'}</div>
            </div>
            <div className="text-center font-bold mb-3">REÇU DE VENTE</div>
            <div className="flex justify-between text-xs mb-1">
              <span>N°: {lastSale?.id.slice(-8).toUpperCase()}</span>
              <span>{lastSale && new Date(lastSale.createdAt).toLocaleDateString('fr-FR')}</span>
            </div>
            <div className="flex justify-between text-xs mb-2">
              <span>{lastSale && new Date(lastSale.createdAt).toLocaleTimeString('fr-FR')}</span>
              <span>{user?.name}</span>
            </div>
            <div className="border-t border-dashed my-2"></div>
            <div className="flex justify-between font-bold text-xs mb-2">
              <span>Article</span>
              <span>Qté</span>
              <span>Prix</span>
            </div>
            {lastSale?.items?.map((item, idx) => (
              <div key={idx} className="flex justify-between text-xs">
                <span className="flex-1 truncate">{item.product?.name}</span>
                <span className="w-8 text-center">x{item.quantity}</span>
                <span className="w-20 text-right">{formatPrice(item.quantity * item.unitPrice)}</span>
              </div>
            ))}
            <div className="border-t border-dashed my-2"></div>
            <div className="flex justify-between text-xs">
              <span>Sous-total:</span>
              <span>{lastSale && formatPrice(lastSale.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Paiement:</span>
              <span>{lastSale?.paymentMethod === 'CASH' ? 'Espèces' : 'Mobile Money'}</span>
            </div>
            <div className="flex justify-between font-bold text-base mt-2 pt-2 border-t">
              <span>TOTAL:</span>
              <span className="text-emerald-600">{lastSale && formatPrice(lastSale.totalAmount)}</span>
            </div>
            <div className="text-center mt-4 text-xs text-muted-foreground">
              <div className="font-bold">Merci de votre visite !</div>
              <div>À bientôt</div>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={handlePrint} className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              Imprimer
            </Button>
            <Button variant="outline" onClick={handleDownloadPDF} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              PDF
            </Button>
          </div>

          {/* Info impression */}
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-sm">
            <div className="flex items-start gap-2">
              <Bluetooth className="h-4 w-4 mt-0.5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-700 dark:text-blue-400">Impression Bluetooth / USB</p>
                <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                  Cliquez sur "Imprimer" puis sélectionnez votre imprimante Bluetooth, USB ou réseau dans la boîte de dialogue.
                </p>
              </div>
            </div>
          </div>

          <Button 
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600" 
            onClick={() => setReceiptDialogOpen(false)}
          >
            Fermer
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Composant Historique des ventes
function SalesHistory() {
  const { user } = useAppStore();
  const isOwner = user?.role === 'OWNER';
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/sales?limit=50')
      .then((res) => res.json())
      .then((data) => {
        setSales(data.sales || []);
        setLoading(false);
      });
  }, []);

  // Générer le HTML du reçu pour l'impression
  const generateReceiptHtml = (saleData: Sale) => {
    const shopName = user?.ownedShop?.name || user?.shop?.name || 'Ma Boutique';
    const date = new Date(saleData.createdAt);
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Reçu ${saleData.id.slice(-8).toUpperCase()}</title>
        <style>
          @page { size: 80mm auto; margin: 2mm; }
          body { 
            font-family: 'Courier New', monospace; 
            font-size: 12px; 
            width: 75mm;
            padding: 5mm;
            margin: 0;
          }
          .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; }
          .shop-name { font-size: 16px; font-weight: bold; }
          .title { text-align: center; font-weight: bold; font-size: 14px; margin: 10px 0; }
          .info-row { display: flex; justify-content: space-between; margin: 3px 0; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .items-header { display: flex; justify-content: space-between; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 5px; margin-bottom: 5px; }
          .item-row { display: flex; justify-content: space-between; margin: 4px 0; }
          .item-name { flex: 2; }
          .item-qty { width: 40px; text-align: center; }
          .item-price { width: 70px; text-align: right; }
          .total-row { display: flex; justify-content: space-between; margin: 5px 0; }
          .grand-total { display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; border-top: 1px solid #000; padding-top: 5px; margin-top: 5px; }
          .footer { text-align: center; margin-top: 15px; font-size: 10px; }
          .thank-you { font-weight: bold; margin-bottom: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="shop-name">${shopName}</div>
        </div>
        <div class="title">REÇU DE VENTE</div>
        <div class="info-row"><span>N°: ${saleData.id.slice(-8).toUpperCase()}</span><span>Date: ${date.toLocaleDateString('fr-FR')}</span></div>
        <div class="info-row"><span>Heure: ${date.toLocaleTimeString('fr-FR')}</span><span>Vendeur: ${saleData.user?.name || 'N/A'}</span></div>
        ${saleData.customerName ? `<div class="info-row"><span>Client: ${saleData.customerName}</span></div>` : ''}
        <div class="divider"></div>
        <div class="items-header">
          <span class="item-name">Article</span>
          <span class="item-qty">Qté</span>
          <span class="item-price">Prix</span>
        </div>
        ${(saleData.items || []).map(item => `
          <div class="item-row">
            <span class="item-name">${item.product?.name || 'Produit'}</span>
            <span class="item-qty">x${item.quantity}</span>
            <span class="item-price">${formatPrice(item.quantity * item.unitPrice)}</span>
          </div>
        `).join('')}
        <div class="divider"></div>
        <div class="total-row"><span>Sous-total:</span><span>${formatPrice(saleData.totalAmount)}</span></div>
        <div class="total-row"><span>Paiement:</span><span>${saleData.paymentMethod === 'CASH' ? 'Espèces' : 'Mobile Money'}</span></div>
        <div class="grand-total"><span>TOTAL:</span><span>${formatPrice(saleData.totalAmount)}</span></div>
        <div class="footer">
          <div class="thank-you">Merci de votre visite !</div>
          <div>À bientôt</div>
        </div>
      </body>
      </html>
    `;
  };

  // Imprimer le reçu
  const handlePrintReceipt = (sale: Sale) => {
    const html = generateReceiptHtml(sale);
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  // Télécharger le reçu en PDF
  const handleDownloadReceipt = async (sale: Sale) => {
    const shopName = user?.ownedShop?.name || user?.shop?.name || 'Ma Boutique';
    const receiptData = generateReceiptData(sale, shopName, sale.user?.name || 'Vendeur');
    
    const blob = await pdf(<ReceiptPDF data={receiptData} />).toBlob();
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `recu-${sale.id.slice(-8).toUpperCase()}.pdf`;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({ title: 'Téléchargement', description: 'Le reçu PDF a été téléchargé' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Historique des ventes</h1>
        <p className="text-muted-foreground">Consultez et gérez toutes les transactions</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date et heure</TableHead>
                <TableHead>Articles</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Vendeur</TableHead>
                <TableHead>Paiement</TableHead>
                {isOwner && <TableHead className="text-right">Montant</TableHead>}
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{new Date(sale.createdAt).toLocaleDateString('fr-FR')}</p>
                      <p className="text-xs text-muted-foreground">{new Date(sale.createdAt).toLocaleTimeString('fr-FR')}</p>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="secondary">{sale.items?.length || 0} articles</Badge></TableCell>
                  <TableCell>{sale.customerName || 'Client passage'}</TableCell>
                  <TableCell>{sale.user?.name}</TableCell>
                  <TableCell>
                    <Badge variant={sale.paymentMethod === 'CASH' ? 'default' : 'secondary'}>
                      {sale.paymentMethod === 'CASH' ? 'Espèces' : 'Mobile Money'}
                    </Badge>
                  </TableCell>
                  {isOwner && <TableCell className="text-right font-semibold">{formatPrice(sale.totalAmount)}</TableCell>}
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="ghost" title="Voir détails">
                            <ClipboardList className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Détails de la vente</DialogTitle>
                            <DialogDescription>{new Date(sale.createdAt).toLocaleString('fr-FR')}</DialogDescription>
                          </DialogHeader>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Produit</TableHead>
                                <TableHead className="text-center">Qté</TableHead>
                                {isOwner && <TableHead className="text-right">Prix unitaire</TableHead>}
                                {isOwner && <TableHead className="text-right">Sous-total</TableHead>}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {sale.items?.map((item) => (
                                <TableRow key={item.id}>
                                  <TableCell>{item.product?.name}</TableCell>
                                  <TableCell className="text-center">{item.quantity}</TableCell>
                                  {isOwner && <TableCell className="text-right">{formatPrice(item.unitPrice)}</TableCell>}
                                  {isOwner && <TableCell className="text-right">{formatPrice(item.quantity * item.unitPrice)}</TableCell>}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          {isOwner && (
                            <div className="flex justify-between items-center pt-4 border-t font-bold">
                              <span>Total:</span>
                              <span className="text-emerald-600">{formatPrice(sale.totalAmount)}</span>
                            </div>
                          )}
                          <div className="flex gap-2 pt-4">
                            <Button variant="outline" onClick={() => handlePrintReceipt(sale)} className="flex-1">
                              <Printer className="h-4 w-4 mr-2" />
                              Imprimer
                            </Button>
                            <Button variant="outline" onClick={() => handleDownloadReceipt(sale)} className="flex-1">
                              <Download className="h-4 w-4 mr-2" />
                              PDF
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button size="sm" variant="ghost" onClick={() => handlePrintReceipt(sale)} title="Imprimer reçu">
                        <Printer className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

// Composant Rapports
function Reports() {
  const { user } = useAppStore();
  const shopName = user?.ownedShop?.name || user?.shop?.name || 'Ma Boutique';
  
  // État pour la date sélectionnée (rapport journalier)
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // Format YYYY-MM-DD
  });
  
  // État pour le mois/année (rapport mensuel)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const [dailyReport, setDailyReport] = useState<{
    date: string;
    summary: { totalSales: number; totalRevenue: number; totalProfit: number; cashRevenue: number; mobileRevenue: number; cashSalesCount: number; mobileSalesCount: number };
    topProducts: { name: string; quantity: number; revenue: number; profit: number }[];
    salesByHour: Record<number, number>;
    sales: Array<{ id: string; createdAt: string; totalAmount: number; paymentMethod: string; customerName?: string; user?: { name: string }; itemCount: number }>;
  } | null>(null);
  
  const [monthlyReport, setMonthlyReport] = useState<{
    month: string;
    summary: { totalSales: number; totalRevenue: number; totalProfit: number; cashRevenue: number; mobileRevenue: number; averageDailyRevenue: number };
    dailyData: { date: string; revenue: number; sales: number; profit: number }[];
    topProducts: { name: string; quantity: number; revenue: number }[];
  } | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'daily' | 'monthly'>('daily');

  // Générer les années disponibles (année actuelle et 2 années précédentes)
  const availableYears = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i);

  const months = [
    { value: 1, label: 'Janvier' }, { value: 2, label: 'Février' }, { value: 3, label: 'Mars' },
    { value: 4, label: 'Avril' }, { value: 5, label: 'Mai' }, { value: 6, label: 'Juin' },
    { value: 7, label: 'Juillet' }, { value: 8, label: 'Août' }, { value: 9, label: 'Septembre' },
    { value: 10, label: 'Octobre' }, { value: 11, label: 'Novembre' }, { value: 12, label: 'Décembre' },
  ];

  // Fonction pour formater une date en français
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  // Navigation entre les jours
  const goToPreviousDay = () => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() - 1);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const goToNextDay = () => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + 1);
    const today = new Date();
    if (current <= today) {
      setSelectedDate(current.toISOString().split('T')[0]);
    }
  };

  const goToToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  // Navigation entre les mois
  const goToPreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const goToCurrentMonth = () => {
    setSelectedMonth(new Date().getMonth() + 1);
    setSelectedYear(new Date().getFullYear());
  };

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        const [dailyRes, monthlyRes] = await Promise.all([
          fetch(`/api/reports/daily?date=${selectedDate}`),
          fetch(`/api/reports/monthly?month=${selectedMonth}&year=${selectedYear}`),
        ]);

        setDailyReport(await dailyRes.json());
        setMonthlyReport(await monthlyRes.json());
      } catch {
        console.error('Erreur lors du chargement des rapports');
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [selectedDate, selectedMonth, selectedYear]);

  // Vérifier si la date sélectionnée est aujourd'hui
  const isToday = selectedDate === new Date().toISOString().split('T')[0];
  
  // Vérifier si le mois sélectionné est le mois actuel
  const isCurrentMonth = selectedMonth === new Date().getMonth() + 1 && selectedYear === new Date().getFullYear();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  // Icône calendrier pour la navigation
  const CalendarIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );

  return (
    <div className="space-y-6">
      {/* En-tête avec sélecteur de vue */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rapports et Analyses</h1>
          <p className="text-muted-foreground">{shopName} - Suivez vos performances</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={activeView === 'daily' ? 'default' : 'outline'}
            onClick={() => setActiveView('daily')}
            className={activeView === 'daily' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            Journalier
          </Button>
          <Button
            variant={activeView === 'monthly' ? 'default' : 'outline'}
            onClick={() => setActiveView('monthly')}
            className={activeView === 'monthly' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
          >
            <PieChart className="h-4 w-4 mr-2" />
            Mensuel
          </Button>
        </div>
      </div>

      {/* ===== VUE JOURNALIÈRE ===== */}
      {activeView === 'daily' && (
        <>
          {/* Sélecteur de date */}
          <Card className="border-emerald-200 dark:border-emerald-800">
            <CardContent className="py-3">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* Navigation gauche */}
                <Button variant="outline" onClick={goToPreviousDay} size="sm" className="w-full sm:w-auto">
                  <span className="hidden sm:inline">← Jour précédent</span>
                  <span className="sm:hidden">← Précédent</span>
                </Button>
                
                {/* Sélecteur de date centré */}
                <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                  <div className="text-center">
                    <p className="text-sm sm:text-lg font-semibold capitalize">{formatDate(selectedDate)}</p>
                    {isToday && (
                      <Badge className="bg-emerald-500 mt-1 text-xs">Aujourd&apos;hui</Badge>
                    )}
                  </div>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      const selected = new Date(e.target.value);
                      const today = new Date();
                      if (selected <= today) {
                        setSelectedDate(e.target.value);
                      }
                    }}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full sm:w-36 text-sm"
                  />
                </div>
                
                {/* Navigation droite */}
                <div className="flex gap-2 w-full sm:w-auto justify-end">
                  <Button 
                    variant="outline" 
                    onClick={goToNextDay}
                    disabled={isToday}
                    size="sm"
                    className="flex-1 sm:flex-none"
                  >
                    <span className="hidden sm:inline">Jour suivant →</span>
                    <span className="sm:hidden">Suivant →</span>
                  </Button>
                  {!isToday && (
                    <Button variant="ghost" onClick={goToToday} size="sm" className="text-emerald-600 text-xs px-2">
                      Aujourd&apos;hui
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistiques du jour */}
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <Card className="border-l-4 border-l-emerald-500">
              <CardHeader className="pb-1 pt-3 px-3">
                <CardTitle className="text-xs sm:text-sm font-medium">Revenus du jour</CardTitle>
              </CardHeader>
              <CardContent className="pb-3 px-3">
                <div className="text-lg sm:text-2xl font-bold text-emerald-600">
                  {formatPrice(dailyReport?.summary?.totalRevenue || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {dailyReport?.summary?.totalSales || 0} vente{(dailyReport?.summary?.totalSales || 0) !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-l-4 border-l-teal-500">
              <CardHeader className="pb-1 pt-3 px-3">
                <CardTitle className="text-xs sm:text-sm font-medium">Bénéfice</CardTitle>
              </CardHeader>
              <CardContent className="pb-3 px-3">
                <div className="text-lg sm:text-2xl font-bold text-teal-600">
                  {formatPrice(dailyReport?.summary?.totalProfit || 0)}
                </div>
                <p className="text-xs text-muted-foreground">Après coûts</p>
              </CardContent>
            </Card>
            
            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="pb-1 pt-3 px-3">
                <CardTitle className="text-xs sm:text-sm font-medium">Espèces</CardTitle>
              </CardHeader>
              <CardContent className="pb-3 px-3">
                <div className="text-lg sm:text-2xl font-bold text-orange-600">
                  {formatPrice(dailyReport?.summary?.cashRevenue || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {dailyReport?.summary?.cashSalesCount || 0} vente{(dailyReport?.summary?.cashSalesCount || 0) !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-1 pt-3 px-3">
                <CardTitle className="text-xs sm:text-sm font-medium">Mobile Money</CardTitle>
              </CardHeader>
              <CardContent className="pb-3 px-3">
                <div className="text-lg sm:text-2xl font-bold text-blue-600">
                  {formatPrice(dailyReport?.summary?.mobileRevenue || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {dailyReport?.summary?.mobileSalesCount || 0} vente{(dailyReport?.summary?.mobileSalesCount || 0) !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Graphique des ventes par heure et Top produits */}
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm sm:text-base">Ventes par heure</CardTitle>
                <CardDescription className="text-xs">Répartition des revenus</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] sm:h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={Object.entries(dailyReport?.salesByHour || {}).map(([hour, amount]) => ({
                        hour: `${hour}h`,
                        amount
                      })).filter((_, i) => i % 2 === 0)}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="hour" fontSize={10} />
                      <YAxis fontSize={10} />
                      <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm sm:text-base">Top produits du jour</CardTitle>
                <CardDescription className="text-xs">Meilleures ventes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(dailyReport?.topProducts || []).slice(0, 5).map((product, index) => (
                    <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.quantity} vendu{product.quantity !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="font-semibold text-emerald-600 text-sm">{formatPrice(product.revenue)}</p>
                        <p className="text-xs text-muted-foreground">+{formatPrice(product.profit)}</p>
                      </div>
                    </div>
                  ))}
                  {(dailyReport?.topProducts || []).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      Aucune vente ce jour
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Détail des ventes du jour */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm sm:text-base">Détail des ventes</CardTitle>
              <CardDescription className="text-xs">Liste des transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-60 sm:max-h-80 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Heure</TableHead>
                      <TableHead>Articles</TableHead>
                      <TableHead>Vendeur</TableHead>
                      <TableHead>Paiement</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(dailyReport?.sales || []).map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell>{new Date(sale.createdAt).toLocaleTimeString('fr-FR')}</TableCell>
                        <TableCell>{sale.itemCount} article{sale.itemCount !== 1 ? 's' : ''}</TableCell>
                        <TableCell>{sale.user?.name || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant={sale.paymentMethod === 'CASH' ? 'default' : 'secondary'}>
                            {sale.paymentMethod === 'CASH' ? 'Espèces' : 'Mobile'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatPrice(sale.totalAmount)}</TableCell>
                      </TableRow>
                    ))}
                    {(dailyReport?.sales || []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          Aucune vente ce jour
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ===== VUE MENSUELLE ===== */}
      {activeView === 'monthly' && (
        <>
          {/* Sélecteur de mois */}
          <Card className="border-teal-200 dark:border-teal-800">
            <CardContent className="py-3">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* Navigation gauche */}
                <Button variant="outline" onClick={goToPreviousMonth} size="sm" className="w-full sm:w-auto">
                  <span className="hidden sm:inline">← Mois précédent</span>
                  <span className="sm:hidden">← Précédent</span>
                </Button>
                
                {/* Sélecteur de mois/année */}
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                    <SelectTrigger className="w-28 sm:w-32 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((m) => (
                        <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                    <SelectTrigger className="w-20 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableYears.map((year) => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isCurrentMonth && (
                    <Badge className="bg-teal-500 text-xs">Actuel</Badge>
                  )}
                </div>
                
                {/* Navigation droite */}
                <div className="flex gap-2 w-full sm:w-auto justify-end">
                  <Button 
                    variant="outline" 
                    onClick={goToNextMonth}
                    disabled={isCurrentMonth}
                    size="sm"
                    className="flex-1 sm:flex-none"
                  >
                    <span className="hidden sm:inline">Mois suivant →</span>
                    <span className="sm:hidden">Suivant →</span>
                  </Button>
                  {!isCurrentMonth && (
                    <Button variant="ghost" onClick={goToCurrentMonth} size="sm" className="text-teal-600 text-xs px-2">
                      Ce mois
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistiques du mois */}
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <Card className="border-l-4 border-l-cyan-500">
              <CardHeader className="pb-1 pt-3 px-3">
                <CardTitle className="text-xs sm:text-sm font-medium">Revenus du mois</CardTitle>
              </CardHeader>
              <CardContent className="pb-3 px-3">
                <div className="text-lg sm:text-2xl font-bold text-cyan-600">
                  {formatPrice(monthlyReport?.summary?.totalRevenue || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {monthlyReport?.summary?.totalSales || 0} vente{(monthlyReport?.summary?.totalSales || 0) !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-l-4 border-l-sky-500">
              <CardHeader className="pb-1 pt-3 px-3">
                <CardTitle className="text-xs sm:text-sm font-medium">Bénéfice</CardTitle>
              </CardHeader>
              <CardContent className="pb-3 px-3">
                <div className="text-lg sm:text-2xl font-bold text-sky-600">
                  {formatPrice(monthlyReport?.summary?.totalProfit || 0)}
                </div>
                <p className="text-xs text-muted-foreground">Après coûts</p>
              </CardContent>
            </Card>
            
            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="pb-1 pt-3 px-3">
                <CardTitle className="text-xs sm:text-sm font-medium">Espèces</CardTitle>
              </CardHeader>
              <CardContent className="pb-3 px-3">
                <div className="text-lg sm:text-2xl font-bold text-orange-600">
                  {formatPrice(monthlyReport?.summary?.cashRevenue || 0)}
                </div>
                <p className="text-xs text-muted-foreground">Paiements espèces</p>
              </CardContent>
            </Card>
            
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-1 pt-3 px-3">
                <CardTitle className="text-xs sm:text-sm font-medium">Mobile Money</CardTitle>
              </CardHeader>
              <CardContent className="pb-3 px-3">
                <div className="text-lg sm:text-2xl font-bold text-blue-600">
                  {formatPrice(monthlyReport?.summary?.mobileRevenue || 0)}
                </div>
                <p className="text-xs text-muted-foreground">Paiements mobiles</p>
              </CardContent>
            </Card>
          </div>

          {/* Graphiques mensuels */}
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm sm:text-base">Tendance des revenus</CardTitle>
                <CardDescription className="text-xs">
                  {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] sm:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyReport?.dailyData || []}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="date" tick={{ fontSize: 8 }} tickFormatter={(v) => v.split('-')[2]} />
                      <YAxis tick={{ fontSize: 8 }} />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name="Revenus" />
                      <Line type="monotone" dataKey="profit" stroke="#14b8a6" strokeWidth={2} name="Bénéfice" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm sm:text-base">Modes de paiement</CardTitle>
                <CardDescription className="text-xs">Répartition par type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] sm:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={[
                          { name: 'Espèces', value: monthlyReport?.summary?.cashRevenue || 0 },
                          { name: 'Mobile Money', value: monthlyReport?.summary?.mobileRevenue || 0 },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${formatPrice(value)}`}
                        labelLine={false}
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#3b82f6" />
                      </Pie>
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tableau top produits du mois */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm sm:text-base">Produits les plus vendus</CardTitle>
              <CardDescription className="text-xs">
                {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Produit</TableHead>
                      <TableHead className="text-center">Qté</TableHead>
                      <TableHead className="text-right">Revenus</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(monthlyReport?.topProducts || []).map((product, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                            index === 0 ? 'bg-yellow-100 text-yellow-700' :
                            index === 1 ? 'bg-slate-100 text-slate-700' :
                            index === 2 ? 'bg-orange-100 text-orange-700' :
                            'bg-slate-50 text-slate-600'
                          }`}>
                            {index + 1}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium text-sm truncate max-w-[150px]">{product.name}</TableCell>
                        <TableCell className="text-center text-sm">{product.quantity}</TableCell>
                        <TableCell className="text-right text-sm">{formatPrice(product.revenue)}</TableCell>
                      </TableRow>
                    ))}
                    {(monthlyReport?.topProducts || []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          Aucune vente ce mois
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// Composant Gestion des Employés
function EmployeesManagement() {
  const [employees, setEmployees] = useState<Array<{
    id: string;
    name: string;
    phone: string;
    role: string;
    createdAt: string;
    _count?: { sales: number };
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<{
    id: string;
    name: string;
    phone: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/employees');
      const data = await res.json();
      if (res.ok) {
        setEmployees(data.employees || []);
      } else {
        toast({ title: 'Erreur', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de charger les employés', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      password: formData.get('password') as string,
    };

    // Validation
    if (!data.name || !data.phone) {
      toast({ title: 'Erreur', description: 'Le nom et le téléphone sont requis', variant: 'destructive' });
      setSaving(false);
      return;
    }

    if (!editingEmployee && !data.password) {
      toast({ title: 'Erreur', description: 'Le mot de passe est requis pour un nouvel employé', variant: 'destructive' });
      setSaving(false);
      return;
    }

    try {
      const url = editingEmployee ? `/api/employees/${editingEmployee.id}` : '/api/employees';
      const method = editingEmployee ? 'PUT' : 'POST';

      const body: Record<string, string> = {
        name: data.name,
        phone: data.phone,
      };
      if (data.password) {
        body.password = data.password;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Erreur lors de la sauvegarde');
      }

      toast({
        title: 'Succès',
        description: editingEmployee ? 'Employé modifié avec succès' : 'Employé créé avec succès'
      });
      setDialogOpen(false);
      setEditingEmployee(null);
      fetchEmployees();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur lors de la sauvegarde',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' });
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Erreur lors de la suppression');
      }

      toast({ title: 'Succès', description: 'Employé supprimé avec succès' });
      setDeleteConfirm(null);
      fetchEmployees();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur lors de la suppression',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (employee: { id: string; name: string; phone: string }) => {
    setEditingEmployee(employee);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employés</h1>
          <p className="text-muted-foreground">Gérez les comptes de vos employés</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingEmployee(null);
        }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-emerald-500 to-teal-600">
              <Plus className="mr-2 h-4 w-4" /> Ajouter un employé
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingEmployee ? 'Modifier l\'employé' : 'Ajouter un employé'}</DialogTitle>
              <DialogDescription>
                {editingEmployee
                  ? 'Modifiez les informations de l\'employé. Laissez le mot de passe vide pour ne pas le changer.'
                  : 'Créez un compte pour votre employé. Il pourra se connecter à l\'Espace Employé.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom complet</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Nom de l'employé"
                  defaultValue={editingEmployee?.name || ''}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Numéro de téléphone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    name="phone"
                    placeholder="+221 77 123 45 67"
                    className="pl-10"
                    defaultValue={editingEmployee?.phone || ''}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">
                  {editingEmployee ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe'}
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    className="pl-10 pr-10"
                    placeholder={editingEmployee ? "Laisser vide pour ne pas changer" : "Mot de passe"}
                    required={!editingEmployee}
                    minLength={4}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {!editingEmployee && (
                  <p className="text-xs text-muted-foreground">
                    L&apos;employé utilisera ce mot de passe pour se connecter
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setDialogOpen(false); setEditingEmployee(null); }}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600"
                  disabled={saving}
                >
                  {saving ? 'Enregistrement...' : editingEmployee ? 'Modifier' : 'Créer'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Liste des employés */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des employés</CardTitle>
          <CardDescription>
            {employees.length} employé{employees.length !== 1 ? 's' : ''} inscrit{employees.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucun employé pour le moment</p>
              <p className="text-sm text-muted-foreground mt-1">
                Ajoutez des employés pour leur permettre d&apos;accéder à la caisse
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead className="text-center">Ventes</TableHead>
                  <TableHead>Date d&apos;inscription</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                          <User className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        </div>
                        {employee.name}
                      </div>
                    </TableCell>
                    <TableCell>{employee.phone}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">
                        {employee._count?.sales || 0} vente{(employee._count?.sales || 0) !== 1 ? 's' : ''}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(employee.createdAt).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(employee)}
                        >
                          Modifier
                        </Button>
                        {deleteConfirm === employee.id ? (
                          <div className="flex gap-1">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(employee.id)}
                            >
                              Confirmer
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteConfirm(null)}
                            >
                              Annuler
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                            onClick={() => setDeleteConfirm(employee.id)}
                          >
                            Supprimer
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Information sur la connexion employé */}
      <Card className="border-orange-200 dark:border-orange-800">
        <CardHeader>
          <CardTitle className="text-orange-600 dark:text-orange-400 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Comment les employés se connectent-ils ?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Vos employés peuvent se connecter via l&apos;<strong>Espace Employé</strong> sur l&apos;écran de connexion.
          </p>
          <div className="grid gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 text-xs font-bold">1</span>
              <span>Ils cliquent sur <strong>"Espace Employé"</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 text-xs font-bold">2</span>
              <span>Ils entrent leur <strong>numéro de téléphone</strong> et <strong>mot de passe</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 text-xs font-bold">3</span>
              <span>Ils ont accès à la <strong>caisse</strong> et à l&apos;<strong>historique des ventes</strong></span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Application principale
export default function App() {
  const { user, isLoading, setUser, setLoading, logout, activeTab, setActiveTab } = useAppStore();

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, [setUser, setLoading]);

  // Définir les onglets selon le rôle
  const allTabs = [
    { id: 'dashboard', label: 'Tableau de bord', icon: BarChart3, roles: ['OWNER', 'EMPLOYEE'] },
    { id: 'pos', label: 'Caisse', icon: ShoppingCart, roles: ['OWNER', 'EMPLOYEE'] },
    { id: 'products', label: 'Produits', icon: Package, roles: ['OWNER'] },
    { id: 'employees', label: 'Employés', icon: Users, roles: ['OWNER'] },
    { id: 'sales', label: 'Ventes', icon: ClipboardList, roles: ['OWNER', 'EMPLOYEE'] },
    { id: 'reports', label: 'Rapports', icon: PieChart, roles: ['OWNER'] },
  ];

  // Filtrer les onglets selon le rôle de l'utilisateur
  const visibleTabs = allTabs.filter(tab => user && tab.roles.includes(user.role));

  // Rediriger si l'onglet actif n'est pas autorisé
  useEffect(() => {
    if (user && activeTab) {
      const allowedTabs = allTabs.filter(tab => tab.roles.includes(user.role)).map(t => t.id);
      if (!allowedTabs.includes(activeTab)) {
        setActiveTab('dashboard');
      }
    }
  }, [user, activeTab, setActiveTab]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* En-tête */}
      <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:bg-slate-900/95">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                  <Store className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-lg hidden sm:block">
                  {user.ownedShop?.name || user.shop?.name || 'Gestion de Boutique'}
                </span>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-1">
              {visibleTabs.map((tab) => (
                <Button key={tab.id} variant={activeTab === tab.id ? 'default' : 'ghost'} className={activeTab === tab.id ? 'bg-emerald-500 hover:bg-emerald-600' : ''} onClick={() => setActiveTab(tab.id)}>
                  <tab.icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </Button>
              ))}
            </nav>

            <div className="flex items-center gap-4">
              <Badge variant="outline" className="hidden sm:flex">
                <User className="h-3 w-3 mr-1" /> {user.name}
              </Badge>
              <Button variant="ghost" size="icon" onClick={logout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation mobile */}
      <nav className="md:hidden sticky top-16 z-40 border-b bg-white dark:bg-slate-900 px-2 py-2 overflow-x-auto">
        <div className="flex gap-1">
          {visibleTabs.map((tab) => (
            <Button key={tab.id} variant={activeTab === tab.id ? 'default' : 'ghost'} size="sm" className={activeTab === tab.id ? 'bg-emerald-500 hover:bg-emerald-600' : ''} onClick={() => setActiveTab(tab.id)}>
              <tab.icon className="h-4 w-4" />
            </Button>
          ))}
        </div>
      </nav>

      {/* Contenu principal */}
      <main className="container mx-auto px-4 py-6">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'pos' && <POSSystem />}
        {activeTab === 'products' && user?.role === 'OWNER' && <ProductsManagement />}
        {activeTab === 'employees' && user?.role === 'OWNER' && <EmployeesManagement />}
        {activeTab === 'sales' && <SalesHistory />}
        {activeTab === 'reports' && user?.role === 'OWNER' && <Reports />}
      </main>

      {/* Pied de page */}
      <footer className="border-t py-4 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Gestion de Boutique - Application de gestion de magasin</p>
        </div>
      </footer>
    </div>
  );
}
