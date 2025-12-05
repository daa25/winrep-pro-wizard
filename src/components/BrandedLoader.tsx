import winzerLogo from "@/assets/winzer-logo.png";

const BrandedLoader = () => {
  return (
    <main role="main" className="min-h-screen flex flex-col items-center justify-center bg-gradient-hero relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>

      {/* Logo with animation */}
      <div className="relative z-10 flex flex-col items-center gap-6 animate-scale-in">
        <img 
          src={winzerLogo} 
          alt="Winzer" 
          className="h-20 w-auto drop-shadow-lg animate-pulse"
        />
        
        {/* Loading indicator */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        
        <p className="text-muted-foreground text-sm animate-fade-in">Loading...</p>
      </div>
    </main>
  );
};

export default BrandedLoader;
