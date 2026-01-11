import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import CreateBagForm from '../components/CreateBagForm';
import BagCreated from '../components/BagCreated';
import type { CreateBagResponse } from '../types';

export default function HomePage() {
  const [createdBag, setCreatedBag] = useState<CreateBagResponse | null>(null);

  if (createdBag) {
    return (
      <BagCreated
        bagData={createdBag}
        onCreateAnother={() => setCreatedBag(null)}
      />
    );
  }

  return (
    <div className="h-screen bg-regal-navy-50 text-regal-navy-900 overflow-y-auto pb-16">
      <Helmet>
        <title>Create New Bag | YouFoundMyBag.com</title>
      </Helmet>
      <div className="max-w-md mx-auto p-6 lg:max-w-2xl">
        <header className="text-center mb-8 mt-2">
          <h1 className="text-4xl font-semibold mb-3 text-regal-navy-900">
            YouFoundMyBag
            <span className="text-xl text-regal-navy-500 font-normal ml-1">
              .com
            </span>
          </h1>
          <p className="text-regal-navy-700 text-lg font-medium mb-2">
            Protect your belongings with smart recovery tags.
          </p>
          <p className="text-regal-navy-600 mt-3 max-w-lg mx-auto leading-relaxed">
            Create a QR code for your bags, backpacks, and valuables. If someone
            finds them, they can contact you safely without seeing your personal
            info.
          </p>
        </header>

        <main>
          <CreateBagForm onSuccess={setCreatedBag} />
        </main>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-t border-regal-navy-100 text-center py-4 text-regal-navy-500 text-sm">
        <p>
          Privacy-first • No tracking •{' '}
          <a
            href="https://github.com/johnqherman/YouFoundMyBag.com"
            target="_blank"
            rel="noopener noreferrer"
            className="link hover:text-regal-navy-700"
          >
            Open source
          </a>
        </p>
      </footer>
    </div>
  );
}
