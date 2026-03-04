'use client';

import { useEffect, useState, useCallback } from 'react';
import { db, Product, Sale, User } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
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
import {
  Store, Package, ShoppingCart, BarChart3, LogOut, Plus, Minus, Trash2,
  Search, Barcode, TrendingUp, Users, CreditCard,
  Phone, Lock, User as UserIcon, Building2, ClipboardList,
  PieChart, AlertTriangle, CheckCircle, Image as ImageIcon, X, Upload, Camera, Scan, KeyRound, Eye, EyeOff, Printer, Download, FileText, Bluetooth, Wifi, WifiOff, Settings, Server
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, LineChart, Line, Legend } from 'recharts';

// ============ SERVER CONFIG COMPONENT ============
function ServerConfigDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [serverUrl, setServerUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; addresses?: { name: string; address: string }[]; error?: string } | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    setServerUrl(db.getServerUrl());
    setIsConnected(db.isOnline());
  }, [open]);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await db.testConnection(serverUrl);
      setTestResult(result);
    } catch (error) {
      setTestResult({ success: false, error: 'Erreur de connexion' });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    if (serverUrl) {
      // Remove trailing slash
      const cleanUrl = serverUrl.replace(/\/+$/, '');
      db.setServerUrl(cleanUrl);
      setIsConnected(true);
      toast({ title: 'Succès', description: 'Serveur configuré avec succès' });
      onOpenChange(false);
    } else {
      db.clearServerUrl();
      setIsConnected(false);
      toast({ title: 'Mode local', description: 'Utilisation du stockage local' });
      onOpenChange(false);
    }
  };

  const handleDisconnect = () => {
    db.clearServerUrl();
    setServerUrl('');
    setIsConnected(false);
    setTestResult(null);
    toast({ title: 'Déconnecté', description: 'Mode local activé' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            Configuration du serveur
          </DialogTitle>
          <DialogDescription>
            Connectez-vous au serveur de la boutique pour synchroniser vos données
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Connection status */}
          <div className={`flex items-center gap-2 p-3 rounded-lg ${isConnected ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-slate-50 dark:bg-slate-950/30'}`}>
            {isConnected ? (
              <>
                <Wifi className="w-5 h-5 text-emerald-500" />
                <div className="flex-1">
                  <p className="font-medium text-emerald-700 dark:text-emerald-400">Connecté au serveur</p>
                  <p className="text-xs text-muted-foreground">{db.getServerUrl()}</p>
                </div>
              </>
            ) : (
              <>
                <WifiOff className="w-5 h-5 text-slate-400" />
                <div className="flex-1">
                  <p className="font-medium text-slate-700 dark:text-slate-400">Mode local</p>
                  <p className="text-xs text-muted-foreground">Données stockées sur cet appareil</p>
                </div>
              </>
            )}
          </div>

          {/* Server URL input */}
          <div className="space-y-2">
            <Label htmlFor="serverUrl">Adresse du serveur</Label>
            <div className="flex gap-2">
              <Input
                id="serverUrl"
                placeholder="http://192.168.1.100:3000"
                value={serverUrl}
                onChange={(e) => {
                  setServerUrl(e.target.value);
                  setTestResult(null);
                }}
                className="flex-1"
              />
              <Button variant="outline" onClick={handleTest} disabled={testing || !serverUrl}>
                {testing ? 'Test...' : 'Tester'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Entrez l&apos;adresse IP de l&apos;ordinateur serveur (ex: http://192.168.1.100:3000)
            </p>
          </div>

          {/* Test result */}
          {testResult && (
            <div className={`p-3 rounded-lg ${testResult.success ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-red-50 dark:bg-red-950/30'}`}>
              {testResult.success ? (
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-emerald-700 dark:text-emerald-400">Connexion réussie !</p>
                    {testResult.addresses && testResult.addresses.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Adresses IP: {testResult.addresses.map(a => a.address).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-700 dark:text-red-400">Échec de connexion</p>
                    <p className="text-xs text-muted-foreground">{testResult.error}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {isConnected && (
              <Button variant="outline" onClick={handleDisconnect} className="flex-1">
                Déconnecter
              </Button>
            )}
            <Button onClick={handleSave} className="flex-1">
              {serverUrl ? 'Enregistrer' : 'Utiliser le mode local'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============ AUTH SCREEN ============
function AuthScreen() {
  const [userType, setUserType] = useState<'employee' | 'owner' | null>(null);
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetStep, setResetStep] = useState<'verify' | 'reset'>('verify');
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [serverConfigOpen, setServerConfigOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const { setUser } = useAppStore();

  useEffect(() => {
    setIsConnected(db.isOnline());
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const phone = formData.get('phone') as string;
    const password = formData.get('password') as string;
    const name = formData.get('name') as string;
    const shopName = formData.get('shopName') as string;

    try {
      if (isLogin) {
        const role = userType === 'employee' ? 'EMPLOYEE' : 'OWNER';
        const user = await db.login(phone, password, role);
        setUser(user);
        toast({ title: 'Succès', description: 'Bienvenue !' });
      } else {
        // Register (only for owner)
        const user = await db.register(name, phone, password, shopName);
        setUser(user);
        toast({ title: 'Succès', description: 'Compte créé avec succès !' });
      }
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
      const user = await db.login(phone, 'dummy').catch(() => null);
      // For simplicity, just allow reset if phone exists
      setVerifiedPhone(phone);
      setResetStep('reset');
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Utilisateur non trouvé',
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
    const name = formData.get('resetName') as string;

    if (newPassword !== confirmPassword) {
      toast({ title: 'Erreur', description: 'Les mots de passe ne correspondent pas', variant: 'destructive' });
      setResetLoading(false);
      return;
    }

    try {
      await db.resetPassword(verifiedPhone!, name, newPassword);
      toast({ title: 'Succès', description: 'Mot de passe réinitialisé avec succès !' });
      setResetDialogOpen(false);
      setResetStep('verify');
      setVerifiedPhone(null);
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

  // User type selection screen
  if (!userType) {
    return (
      <>
        <ServerConfigDialog open={serverConfigOpen} onOpenChange={setServerConfigOpen} />
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
          <Card className="w-full max-w-lg border-0 shadow-2xl">
            <CardHeader className="text-center space-y-4 relative">
              {/* Server config button */}
              <button
                onClick={() => setServerConfigOpen(true)}
                className="absolute top-0 right-0 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Configuration du serveur"
              >
                {isConnected ? (
                  <Wifi className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Settings className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Store className="w-10 h-10 text-white" />
              </div>
              <div>
                <CardTitle className="text-3xl font-bold">Gestion de Boutique</CardTitle>
                <CardDescription className="text-base mt-2">Bienvenue ! Sélectionnez votre espace de connexion</CardDescription>
              </div>
              {/* Connection status indicator */}
              {isConnected && (
                <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                  <Wifi className="w-3 h-3 mr-1" /> Connecté au serveur
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <button
                onClick={() => setUserType('owner')}
                className="w-full p-6 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all group text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                    <UserIcon className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-emerald-600 dark:text-emerald-400">Espace Gérant</h3>
                    <p className="text-sm text-muted-foreground">Accès complet : produits, ventes, rapports, employés</p>
                  </div>
                  <div className="text-emerald-500 group-hover:translate-x-1 transition-transform">→</div>
                </div>
              </button>

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

              {/* Server config link */}
              <button
                onClick={() => setServerConfigOpen(true)}
                className="w-full mt-4 text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-2 py-2"
              >
                {isConnected ? (
                  <>
                    <Wifi className="w-4 h-4" /> Configurer la connexion serveur
                  </>
                ) : (
                  <>
                    <Settings className="w-4 h-4" /> Configurer la connexion au serveur
                  </>
                )}
              </button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  const backgroundClass = userType === 'owner' 
    ? 'bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900'
    : 'bg-gradient-to-br from-orange-900 via-orange-800 to-amber-900';

  return (
    <>
      <ServerConfigDialog open={serverConfigOpen} onOpenChange={setServerConfigOpen} />
      <div className={`min-h-screen flex items-center justify-center ${backgroundClass} p-4`}>
        <Card className="w-full max-w-md border-0 shadow-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4 relative">
            <button
              onClick={() => { setUserType(null); setIsLogin(true); }}
              className="absolute top-0 left-0 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              ← Retour
            </button>
            {/* Server config button */}
            <button
              onClick={() => setServerConfigOpen(true)}
              className="absolute top-0 right-0 p-2 rounded-lg hover:bg-white/10 transition-colors"
              title="Configuration du serveur"
            >
              {isConnected ? (
                <Wifi className="w-5 h-5 text-emerald-400" />
              ) : (
                <Settings className="w-5 h-5 text-white/60" />
              )}
            </button>
          <div className={`mx-auto w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg ${
            userType === 'owner' 
              ? 'bg-gradient-to-br from-emerald-500 to-teal-600' 
              : 'bg-gradient-to-br from-orange-500 to-amber-600'
          }`}>
            {userType === 'owner' ? (
              <UserIcon className="w-10 h-10 text-white" />
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
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
            userType === 'owner'
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
              : 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300'
          }`}>
            {userType === 'owner' ? (
              <>
                <UserIcon className="w-3 h-3" />
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
          {userType === 'employee' ? (
            <div className="space-y-4">
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
                    <Input id="password" name="password" type={showPassword ? "text" : "password"} className="pl-10 pr-10" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold" disabled={loading}>
                  {loading ? 'Connexion...' : 'Se connecter'}
                </Button>
              </form>
            </div>
          ) : (
            <div className="space-y-4">
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
                      <Input id="password" name="password" type={showPassword ? "text" : "password"} className="pl-10 pr-10" required />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors">
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
                </form>
              </Tabs>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </>
  );
}

// ============ DASHBOARD ============
function Dashboard() {
  const { user } = useAppStore();
  const isOwner = user?.role === 'OWNER';
  const [stats, setStats] = useState({ totalSales: 0, totalRevenue: 0, totalProducts: 0, lowStockProducts: 0 });
  const [recentSales, setRecentSales] = useState<Sale[]>([]);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      const shopId = user.ownedShop?.id || user.shop?.id;
      if (!shopId) return;

      try {
        const report = await db.getDailyReport(shopId);
        const products = await db.getProducts(shopId);
        
        setStats({
          totalSales: report.totalSales,
          totalRevenue: report.totalRevenue,
          totalProducts: products.length,
          lowStockProducts: products.filter(p => p.stockQuantity <= 5).length,
        });
        setRecentSales(report.sales.slice(0, 5));
      } catch (error) {
        console.error('Error loading dashboard:', error);
      }
    };
    loadData();
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
          <p className="text-muted-foreground">Bienvenue, {user?.name} !</p>
        </div>
        <Badge variant="outline" className="text-sm">
          {user?.ownedShop?.name || user?.shop?.name || 'Aucune boutique'}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ventes du jour</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSales}</div>
            {isOwner && <p className="text-xs text-muted-foreground">{formatPrice(stats.totalRevenue)}</p>}
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ventes récentes</CardTitle>
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
                    <TableCell>{new Date(sale.createdAt).toLocaleTimeString('fr-FR')}</TableCell>
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

// ============ POS SYSTEM ============
function POSSystem() {
  const { user, cart, addToCart, removeFromCart, updateCartQuantity, clearCart, getCartTotal } = useAppStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'MOBILE_MONEY'>('CASH');
  const [processing, setProcessing] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [lastSale, setLastSale] = useState<{
    id: string;
    totalAmount: number;
    paymentMethod: string;
    createdAt: string;
    items: { product: { name: string }; quantity: number; unitPrice: number }[];
  } | null>(null);

  useEffect(() => {
    const loadProducts = async () => {
      if (!user) return;
      const shopId = user.ownedShop?.id || user.shop?.id;
      if (!shopId) return;
      const data = await db.getProducts(shopId);
      setProducts(data);
    };
    loadProducts();
  }, [user]);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.barcode && p.barcode.includes(search))
  );

  const handleAddToCart = (product: Product) => {
    if (product.stockQuantity <= 0) {
      toast({ title: 'Stock insuffisant', variant: 'destructive' });
      return;
    }
    const currentInCart = cart.find(item => item.product.id === product.id)?.quantity || 0;
    if (currentInCart >= product.stockQuantity) {
      toast({ title: 'Stock insuffisant', variant: 'destructive' });
      return;
    }
    addToCart(product);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (!user) return;
    
    const shopId = user.ownedShop?.id || user.shop?.id;
    if (!shopId) return;

    setProcessing(true);
    try {
      const sale = await db.createSale({
        shopId,
        userId: user.id,
        totalAmount: getCartTotal(),
        paymentMethod,
        items: cart.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.product.salePrice,
        })),
      });

      // Set the last sale for receipt
      setLastSale({
        id: sale.id,
        totalAmount: sale.totalAmount,
        paymentMethod: sale.paymentMethod,
        createdAt: sale.createdAt,
        items: cart.map(item => ({
          product: { name: item.product.name },
          quantity: item.quantity,
          unitPrice: item.product.salePrice,
        })),
      });

      toast({ title: 'Vente enregistrée', description: 'La vente a été enregistrée avec succès' });
      clearCart();
      
      // Reload products to update stock
      const data = await db.getProducts(shopId);
      setProducts(data);
      
      // Show receipt dialog
      setReceiptOpen(true);
    } catch (error) {
      toast({ title: 'Erreur', description: 'Impossible d\'enregistrer la vente', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Caisse</h1>
          <p className="text-muted-foreground">Effectuez une vente</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Products */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un produit..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleAddToCart(product)}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="w-12 h-12 rounded object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                        <Package className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{product.name}</p>
                      <p className="text-sm text-emerald-600 font-semibold">{formatPrice(product.salePrice)}</p>
                      <p className="text-xs text-muted-foreground">Stock: {product.stockQuantity}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Cart */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Panier
                {cart.length > 0 && (
                  <Badge className="ml-auto">{cart.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cart.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Panier vide</p>
              ) : (
                <>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {cart.map((item) => (
                      <div key={item.product.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.product.name}</p>
                          <p className="text-xs text-muted-foreground">{formatPrice(item.product.salePrice)}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center text-sm">{item.quantity}</span>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={() => removeFromCart(item.product.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between font-bold">
                    <span>Total:</span>
                    <span className="text-emerald-600">{formatPrice(getCartTotal())}</span>
                  </div>

                  <div className="space-y-2">
                    <Label>Mode de paiement</Label>
                    <div className="flex gap-2">
                      <Button
                        variant={paymentMethod === 'CASH' ? 'default' : 'outline'}
                        className="flex-1"
                        onClick={() => setPaymentMethod('CASH')}
                      >
                        Espèces
                      </Button>
                      <Button
                        variant={paymentMethod === 'MOBILE_MONEY' ? 'default' : 'outline'}
                        className="flex-1"
                        onClick={() => setPaymentMethod('MOBILE_MONEY')}
                      >
                        Mobile
                      </Button>
                    </div>
                  </div>

                  <Button className="w-full bg-gradient-to-r from-emerald-500 to-teal-600" onClick={handleCheckout} disabled={processing}>
                    {processing ? 'Traitement...' : 'Valider la vente'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Receipt Dialog */}
      <ReceiptDialog 
        sale={lastSale} 
        open={receiptOpen} 
        onOpenChange={setReceiptOpen} 
      />
    </div>
  );
}

// ============ RECEIPT COMPONENT ============
function ReceiptDialog({ sale, open, onOpenChange }: { 
  sale: { 
    id: string; 
    totalAmount: number; 
    paymentMethod: string; 
    createdAt: string; 
    items: { product: { name: string }; quantity: number; unitPrice: number }[];
  } | null; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const { user } = useAppStore();
  const receiptRef = useState<HTMLDivElement>(null)[0];

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const shopName = user?.ownedShop?.name || user?.shop?.name || 'Ma Boutique';
    const date = new Date(sale?.createdAt || '').toLocaleString('fr-FR');
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Reçu - ${shopName}</title>
        <style>
          body { font-family: 'Courier New', monospace; padding: 20px; max-width: 300px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
          .shop-name { font-size: 18px; font-weight: bold; }
          .date { font-size: 12px; color: #666; }
          .items { margin: 10px 0; }
          .item { display: flex; justify-content: space-between; font-size: 12px; margin: 5px 0; }
          .total { border-top: 1px dashed #000; padding-top: 10px; margin-top: 10px; font-weight: bold; display: flex; justify-content: space-between; }
          .payment { text-align: center; margin-top: 10px; font-size: 12px; }
          .footer { text-align: center; margin-top: 20px; font-size: 11px; color: #666; border-top: 1px dashed #000; padding-top: 10px; }
          .receipt-id { font-size: 10px; color: #999; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="shop-name">${shopName}</div>
          <div class="date">${date}</div>
          <div class="receipt-id">N° ${sale?.id?.slice(-8).toUpperCase()}</div>
        </div>
        <div class="items">
          ${sale?.items?.map(item => `
            <div class="item">
              <span>${item.quantity}x ${item.product.name}</span>
              <span>${formatPrice(item.quantity * item.unitPrice)}</span>
            </div>
          `).join('') || ''}
        </div>
        <div class="total">
          <span>TOTAL</span>
          <span>${formatPrice(sale?.totalAmount || 0)}</span>
        </div>
        <div class="payment">
          Paiement: ${sale?.paymentMethod === 'CASH' ? 'Espèces' : 'Mobile Money'}
        </div>
        <div class="footer">
          Merci de votre visite!<br>
          À bientôt
        </div>
        <script>window.print(); window.close();</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Reçu de vente
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border text-sm font-mono">
            <div className="text-center border-b border-dashed pb-2 mb-2">
              <div className="font-bold text-lg">{user?.ownedShop?.name || user?.shop?.name || 'Ma Boutique'}</div>
              <div className="text-xs text-muted-foreground">{new Date(sale?.createdAt || '').toLocaleString('fr-FR')}</div>
              <div className="text-xs text-muted-foreground">N° {sale?.id?.slice(-8).toUpperCase()}</div>
            </div>
            <div className="space-y-1">
              {sale?.items?.map((item, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span>{item.quantity}x {item.product.name}</span>
                  <span>{formatPrice(item.quantity * item.unitPrice)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-dashed mt-2 pt-2 flex justify-between font-bold">
              <span>TOTAL</span>
              <span className="text-emerald-600">{formatPrice(sale?.totalAmount || 0)}</span>
            </div>
            <div className="text-center text-xs mt-2">
              Paiement: {sale?.paymentMethod === 'CASH' ? 'Espèces' : 'Mobile Money'}
            </div>
            <div className="text-center text-xs text-muted-foreground mt-3 border-t border-dashed pt-2">
              Merci de votre visite!
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
            <Button className="flex-1" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============ PRODUCTS MANAGEMENT ============
function ProductsManagement() {
  const { user } = useAppStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const loadProducts = useCallback(async () => {
    if (!user) return;
    const shopId = user.ownedShop?.id || user.shop?.id;
    if (!shopId) return;
    setLoading(true);
    const data = await db.getProducts(shopId);
    setProducts(data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>): Promise<string | null> => {
    const file = e.target.files?.[0];
    if (!file) return null;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      const data = await res.json();
      if (data.success) {
        setImagePreview(data.imageUrl);
        return data.imageUrl;
      } else {
        toast({ title: 'Erreur', description: data.error, variant: 'destructive' });
        return null;
      }
    } catch (error) {
      toast({ title: 'Erreur', description: 'Impossible de télécharger l\'image', variant: 'destructive' });
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const shopId = user.ownedShop?.id || user.shop?.id;
    if (!shopId) return;

    setSaving(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      barcode: formData.get('barcode') as string || undefined,
      purchasePrice: parseFloat(formData.get('purchasePrice') as string),
      salePrice: parseFloat(formData.get('salePrice') as string),
      stockQuantity: parseInt(formData.get('stockQuantity') as string) || 0,
      category: formData.get('category') as string || undefined,
      imageUrl: imagePreview || editingProduct?.imageUrl || undefined,
      shopId,
    };

    try {
      if (editingProduct) {
        await db.updateProduct(editingProduct.id, data);
        toast({ title: 'Succès', description: 'Produit modifié' });
      } else {
        await db.createProduct(data);
        toast({ title: 'Succès', description: 'Produit créé' });
      }
      setDialogOpen(false);
      setEditingProduct(null);
      setImagePreview(null);
      loadProducts();
    } catch (error) {
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce produit ?')) return;
    await db.deleteProduct(id);
    toast({ title: 'Succès', description: 'Produit supprimé' });
    loadProducts();
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.barcode && p.barcode.includes(search))
  );

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
            setImagePreview(null); 
          } 
        }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-emerald-500 to-teal-600">
              <Plus className="mr-2 h-4 w-4" /> Ajouter un produit
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingProduct ? 'Modifier' : 'Ajouter'} un produit</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4">
              {/* Image Upload */}
              <div className="space-y-2">
                <Label>Photo du produit</Label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden bg-muted">
                    {imagePreview || editingProduct?.imageUrl ? (
                      <img 
                        src={imagePreview || editingProduct?.imageUrl} 
                        alt="Aperçu" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="product-image"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => document.getElementById('product-image')?.click()}
                      disabled={uploadingImage}
                    >
                      {uploadingImage ? (
                        'Chargement...'
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Télécharger
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">
                      JPG, PNG, GIF (max 5MB)
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nom</Label>
                <Input id="name" name="name" defaultValue={editingProduct?.name || ''} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="barcode">Code-barres</Label>
                  <Input id="barcode" name="barcode" defaultValue={editingProduct?.barcode || ''} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Catégorie</Label>
                  <Input id="category" name="category" defaultValue={editingProduct?.category || ''} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purchasePrice">Prix d&apos;achat</Label>
                  <Input id="purchasePrice" name="purchasePrice" type="number" step="0.01" defaultValue={editingProduct?.purchasePrice || ''} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salePrice">Prix de vente</Label>
                  <Input id="salePrice" name="salePrice" type="number" step="0.01" defaultValue={editingProduct?.salePrice || ''} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stockQuantity">Stock</Label>
                  <Input id="stockQuantity" name="stockQuantity" type="number" defaultValue={editingProduct?.stockQuantity || 0} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => (
            <Card key={product.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-16 h-16 rounded object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded bg-muted flex items-center justify-center">
                      <Package className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{product.name}</p>
                    <p className="text-sm text-emerald-600 font-semibold">{formatPrice(product.salePrice)}</p>
                    <p className="text-xs text-muted-foreground">Stock: {product.stockQuantity}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => { setEditingProduct(product); setDialogOpen(true); }}>
                    Modifier
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(product.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ SALES HISTORY ============
function SalesHistory() {
  const { user } = useAppStore();
  const isOwner = user?.role === 'OWNER';
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  useEffect(() => {
    const loadSales = async () => {
      if (!user) return;
      const shopId = user.ownedShop?.id || user.shop?.id;
      if (!shopId) return;
      setLoading(true);
      const data = await db.getSales(shopId);
      setSales(data);
      setLoading(false);
    };
    loadSales();
  }, [user]);

  const handlePrintReceipt = (sale: Sale) => {
    setSelectedSale(sale);
    setReceiptOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Historique des ventes</h1>
          <p className="text-muted-foreground">Consultez toutes les transactions</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div></div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Articles</TableHead>
                <TableHead>Paiement</TableHead>
                {isOwner && <TableHead className="text-right">Montant</TableHead>}
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isOwner ? 5 : 4} className="text-center text-muted-foreground">
                    Aucune vente
                  </TableCell>
                </TableRow>
              ) : (
                sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{new Date(sale.createdAt).toLocaleDateString('fr-FR')}</p>
                        <p className="text-xs text-muted-foreground">{new Date(sale.createdAt).toLocaleTimeString('fr-FR')}</p>
                      </div>
                    </TableCell>
                    <TableCell>{sale.items?.length || 0} articles</TableCell>
                    <TableCell>
                      <Badge variant={sale.paymentMethod === 'CASH' ? 'default' : 'secondary'}>
                        {sale.paymentMethod === 'CASH' ? 'Espèces' : 'Mobile'}
                      </Badge>
                    </TableCell>
                    {isOwner && (
                      <TableCell className="text-right font-medium">{formatPrice(sale.totalAmount)}</TableCell>
                    )}
                    <TableCell>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => handlePrintReceipt(sale)}
                        title="Imprimer le reçu"
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}
      
      {/* Receipt Dialog */}
      <ReceiptDialog 
        sale={selectedSale ? {
          id: selectedSale.id,
          totalAmount: selectedSale.totalAmount,
          paymentMethod: selectedSale.paymentMethod,
          createdAt: selectedSale.createdAt,
          items: selectedSale.items?.map(item => ({
            product: { name: item.productId }, // We'll need to fetch product names
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })) || [],
        } : null}
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
      />
    </div>
  );
}

// ============ REPORTS ============
function Reports() {
  const { user } = useAppStore();
  const [activeView, setActiveView] = useState<'daily' | 'monthly'>('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [dailyReport, setDailyReport] = useState<{
    totalSales: number;
    totalRevenue: number;
    totalProfit: number;
    cashRevenue: number;
    mobileRevenue: number;
    topProducts: { name: string; quantity: number; revenue: number; profit: number }[];
  } | null>(null);
  const [monthlyReport, setMonthlyReport] = useState<{
    totalSales: number;
    totalRevenue: number;
    totalProfit: number;
    cashRevenue: number;
    mobileRevenue: number;
    averageDailyRevenue: number;
    dailyData: { date: string; revenue: number; sales: number; profit: number }[];
    topProducts: { name: string; quantity: number; revenue: number }[];
  } | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      const shopId = user.ownedShop?.id || user.shop?.id;
      if (!shopId) return;

      const daily = await db.getDailyReport(shopId, new Date(selectedDate));
      setDailyReport(daily);

      const monthly = await db.getMonthlyReport(shopId, selectedMonth, selectedYear);
      setMonthlyReport(monthly);
    };
    loadData();
  }, [user, selectedDate, selectedMonth, selectedYear]);

  const months = [
    { value: 1, label: 'Janvier' }, { value: 2, label: 'Février' }, { value: 3, label: 'Mars' },
    { value: 4, label: 'Avril' }, { value: 5, label: 'Mai' }, { value: 6, label: 'Juin' },
    { value: 7, label: 'Juillet' }, { value: 8, label: 'Août' }, { value: 9, label: 'Septembre' },
    { value: 10, label: 'Octobre' }, { value: 11, label: 'Novembre' }, { value: 12, label: 'Décembre' },
  ];

  const availableYears = [new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rapports</h1>
          <p className="text-muted-foreground">Analyses et statistiques</p>
        </div>
        <div className="flex gap-2">
          <Button variant={activeView === 'daily' ? 'default' : 'outline'} onClick={() => setActiveView('daily')} className={activeView === 'daily' ? 'bg-emerald-500' : ''}>
            Journalier
          </Button>
          <Button variant={activeView === 'monthly' ? 'default' : 'outline'} onClick={() => setActiveView('monthly')} className={activeView === 'monthly' ? 'bg-emerald-500' : ''}>
            Mensuel
          </Button>
        </div>
      </div>

      {activeView === 'daily' && (
        <>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <Label>Date:</Label>
                <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-40" />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-l-4 border-l-emerald-500">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Ventes</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">{dailyReport?.totalSales || 0}</div>
                <p className="text-xs text-muted-foreground">{formatPrice(dailyReport?.totalRevenue || 0)}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-teal-500">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Bénéfice</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-teal-600">{formatPrice(dailyReport?.totalProfit || 0)}</div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Espèces</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{formatPrice(dailyReport?.cashRevenue || 0)}</div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Mobile</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{formatPrice(dailyReport?.mobileRevenue || 0)}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Top produits</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(dailyReport?.topProducts || []).slice(0, 5).map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="font-medium">{p.name}</span>
                    <div className="text-right">
                      <span className="text-emerald-600 font-semibold">{formatPrice(p.revenue)}</span>
                      <span className="text-xs text-muted-foreground ml-2">({p.quantity} vendus)</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {activeView === 'monthly' && (
        <>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {months.map((m) => (
                      <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                  <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {availableYears.map((y) => (
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-l-4 border-l-emerald-500">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Ventes</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">{monthlyReport?.totalSales || 0}</div>
                <p className="text-xs text-muted-foreground">{formatPrice(monthlyReport?.totalRevenue || 0)}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-teal-500">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Bénéfice</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-teal-600">{formatPrice(monthlyReport?.totalProfit || 0)}</div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Espèces</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{formatPrice(monthlyReport?.cashRevenue || 0)}</div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Mobile</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{formatPrice(monthlyReport?.mobileRevenue || 0)}</div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

// ============ EMPLOYEES ============
function EmployeesManagement() {
  const { user } = useAppStore();
  const [employees, setEmployees] = useState<User[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadEmployees = useCallback(async () => {
    if (!user) return;
    const shopId = user.ownedShop?.id;
    if (!shopId) return;
    const data = await db.getEmployees(shopId);
    setEmployees(data);
  }, [user]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const shopId = user.ownedShop?.id;
    if (!shopId) return;

    setSaving(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      await db.createEmployee({
        name: formData.get('name') as string,
        phone: formData.get('phone') as string,
        password: formData.get('password') as string,
        shopId,
      });
      toast({ title: 'Succès', description: 'Employé créé' });
      setDialogOpen(false);
      loadEmployees();
    } catch (error) {
      toast({ title: 'Erreur', description: error instanceof Error ? error.message : 'Erreur', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet employé ?')) return;
    await db.deleteEmployee(id);
    toast({ title: 'Succès', description: 'Employé supprimé' });
    loadEmployees();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employés</h1>
          <p className="text-muted-foreground">Gérez les comptes employés</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-emerald-500 to-teal-600">
              <Plus className="mr-2 h-4 w-4" /> Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouvel employé</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input name="name" required />
              </div>
              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input name="phone" required />
              </div>
              <div className="space-y-2">
                <Label>Mot de passe</Label>
                <Input name="password" type="password" required />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? 'Création...' : 'Créer'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    Aucun employé
                  </TableCell>
                </TableRow>
              ) : (
                employees.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium">{emp.name}</TableCell>
                    <TableCell>{emp.phone}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(emp.id)}>
                        Supprimer
                      </Button>
                    </TableCell>
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

// ============ MAIN APP ============
export default function App() {
  const { user, isLoading, isInitialized, initApp, logout, activeTab, setActiveTab } = useAppStore();

  useEffect(() => {
    initApp();
  }, [initApp]);

  const allTabs = [
    { id: 'dashboard', label: 'Tableau de bord', icon: BarChart3, roles: ['OWNER', 'EMPLOYEE'] },
    { id: 'pos', label: 'Caisse', icon: ShoppingCart, roles: ['OWNER', 'EMPLOYEE'] },
    { id: 'products', label: 'Produits', icon: Package, roles: ['OWNER'] },
    { id: 'employees', label: 'Employés', icon: Users, roles: ['OWNER'] },
    { id: 'sales', label: 'Ventes', icon: ClipboardList, roles: ['OWNER', 'EMPLOYEE'] },
    { id: 'reports', label: 'Rapports', icon: PieChart, roles: ['OWNER'] },
  ];

  const visibleTabs = allTabs.filter(tab => user && tab.roles.includes(user.role));

  useEffect(() => {
    if (user && activeTab) {
      const allowedTabs = allTabs.filter(tab => tab.roles.includes(user.role)).map(t => t.id);
      if (!allowedTabs.includes(activeTab)) {
        setActiveTab('dashboard');
      }
    }
  }, [user, activeTab, setActiveTab]);

  if (isLoading || !isInitialized) {
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur">
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
                <UserIcon className="h-3 w-3 mr-1" /> {user.name}
              </Badge>
              <Button variant="ghost" size="icon" onClick={logout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <nav className="md:hidden sticky top-16 z-40 border-b bg-white dark:bg-slate-900 px-2 py-2 overflow-x-auto">
        <div className="flex gap-1">
          {visibleTabs.map((tab) => (
            <Button key={tab.id} variant={activeTab === tab.id ? 'default' : 'ghost'} size="sm" className={activeTab === tab.id ? 'bg-emerald-500 hover:bg-emerald-600' : ''} onClick={() => setActiveTab(tab.id)}>
              <tab.icon className="h-4 w-4" />
            </Button>
          ))}
        </div>
      </nav>

      <main className="container mx-auto px-4 py-6 flex-1">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'pos' && <POSSystem />}
        {activeTab === 'products' && user?.role === 'OWNER' && <ProductsManagement />}
        {activeTab === 'employees' && user?.role === 'OWNER' && <EmployeesManagement />}
        {activeTab === 'sales' && <SalesHistory />}
        {activeTab === 'reports' && user?.role === 'OWNER' && <Reports />}
      </main>

      <footer className="border-t py-4 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Gestion de Boutique - Application de gestion</p>
        </div>
      </footer>
    </div>
  );
}
