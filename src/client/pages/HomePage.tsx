import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import CreateBagForm from '../components/CreateBagForm.js';
import BagCreated from '../components/BagCreated.js';
import type { CreateBagResponse } from '../types/index.js';

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
    <div className="min-h-screen bg-regal-navy-50 text-regal-navy-900 flex flex-col">
      <Helmet>
        <title>Create New Bag | YouFoundMyBag.com</title>
      </Helmet>
      <div className="flex-1 max-w-md mx-auto p-4 sm:p-6 lg:max-w-2xl w-full pb-20 sm:pb-24">
        <header className="text-center mb-6 sm:mb-8 mt-2">
          <h1 className="text-3xl sm:text-4xl font-semibold mb-2 sm:mb-3 text-regal-navy-900">
            YouFoundMyBag
            <span className="text-lg sm:text-xl text-regal-navy-500 font-normal ml-1">
              .com
            </span>
          </h1>
          <p className="text-regal-navy-700 text-base sm:text-lg font-medium mb-2">
            Protect your belongings with smart recovery tags.
          </p>
          <p className="text-sm sm:text-base text-regal-navy-600 mt-2 sm:mt-3 max-w-lg mx-auto leading-relaxed">
            Create a QR code for your bags, backpacks, and valuables. If someone
            finds them, they can contact you safely without seeing your personal
            info.
          </p>
        </header>

        <main>
          <CreateBagForm onSuccess={setCreatedBag} />
        </main>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-regal-navy-100 text-center py-3 sm:py-4 text-regal-navy-500 text-xs sm:text-sm safe-area-bottom">
        <p className="px-4">
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
