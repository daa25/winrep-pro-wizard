import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Sparkles, Copy, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function EmailDrafting() {
  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [products, setProducts] = useState("");
  const [draftedEmail, setDraftedEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const draftEmail = async () => {
    if (!companyName.trim() || !products.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide company name and products",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("draft-email", {
        body: {
          companyName,
          companyWebsite,
          products,
        },
      });

      if (error) throw error;

      setDraftedEmail(data.email);
      toast({
        title: "Email Drafted",
        description: "Your personalized email is ready",
      });
    } catch (error) {
      console.error("Error drafting email:", error);
      toast({
        title: "Error",
        description: "Failed to draft email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(draftedEmail);
    toast({
      title: "Copied",
      description: "Email copied to clipboard",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">AI Email Drafting</h1>
        <p className="text-muted-foreground">
          Generate personalized outreach emails based on company profiles
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
            <CardDescription>
              Provide details about the company you want to reach out to
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                placeholder="e.g., Acme Sports Inc."
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyWebsite">Company Website</Label>
              <Input
                id="companyWebsite"
                type="url"
                placeholder="https://example.com"
                value={companyWebsite}
                onChange={(e) => setCompanyWebsite(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="products">Your Products/Services *</Label>
              <Textarea
                id="products"
                placeholder="List the products or services you want to offer..."
                value={products}
                onChange={(e) => setProducts(e.target.value)}
                rows={5}
              />
            </div>

            <Button onClick={draftEmail} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Drafting Email...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Draft Email with AI
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Generated Email</CardTitle>
            <CardDescription>
              AI-powered personalized email draft
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {draftedEmail ? (
              <>
                <div className="bg-muted p-4 rounded-lg min-h-[300px]">
                  <pre className="whitespace-pre-wrap text-sm font-sans">
                    {draftedEmail}
                  </pre>
                </div>
                <div className="flex gap-2">
                  <Button onClick={copyToClipboard} variant="outline" className="flex-1">
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </Button>
                  <Button className="flex-1">
                    <Send className="mr-2 h-4 w-4" />
                    Send Email
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <p>Fill in company details and click "Draft Email" to generate</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
