import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { NREvsNROArticle } from '../_articles/nre-vs-nro';
import { DTAAExplainedArticle } from '../_articles/dtaa-explained';
import { FEMAGuideArticle } from '../_articles/fema-guide';
import { NRIPropertyArticle } from '../_articles/nri-property-rules';
import { TaxFilingArticle } from '../_articles/tax-filing-checklist';

const ARTICLES: Record<string, { title: string; component: React.ComponentType }> = {
  'nre-vs-nro': { title: 'NRE vs NRO Accounts', component: NREvsNROArticle },
  'dtaa-explained': { title: 'DTAA Treaty Benefits', component: DTAAExplainedArticle },
  'fema-guide': { title: 'FEMA Compliance Guide', component: FEMAGuideArticle },
  'nri-property-rules': { title: 'NRI Property Investment', component: NRIPropertyArticle },
  'tax-filing-checklist': { title: 'NRI Tax Filing Checklist', component: TaxFilingArticle },
};

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = ARTICLES[slug];

  if (!article) {
    notFound();
  }

  const ArticleComponent = article.component;

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-6">
      <Link
        href="/knowledge-hub"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-gold transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to Knowledge Hub
      </Link>

      <h1 className="text-2xl font-bold tracking-tight">{article.title}</h1>

      <ArticleComponent />

      <footer className="text-center pt-6 border-t border-border/50">
        <p className="text-xs text-muted-foreground">
          For educational purposes only. Consult a qualified tax advisor for personalized advice.
        </p>
      </footer>
    </div>
  );
}
