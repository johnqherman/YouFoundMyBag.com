import { useState } from 'react';
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
    <div className="min-h-screen bg-neutral-950 text-neutral-100 pb-20">
      <div className="max-w-md mx-auto p-6 lg:max-w-2xl">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">
            YouFoundMyBag!
            <span className="text-xl text-neutral-500 font-normal ml-0.5">
              .com
            </span>
          </h1>
          <p className="text-neutral-300 text-lg">
            Protect your belongings with smart recovery tags.
          </p>
          <p className="text-neutral-400 mt-2">
            Create a QR code for your bags, backpacks, and valuables. If someone
            finds them, they can contact you safely without seeing your personal
            info.
          </p>
        </header>

        <main>
          <CreateBagForm onSuccess={setCreatedBag} />
        </main>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 bg-neutral-950/80 backdrop-blur-sm text-center py-6 text-neutral-500 text-sm">
        <p>
          Privacy-first • No tracking •{' '}
          <a
            href="https://github.com/johnqherman/YouFoundMyBag.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-neutral-400 transition-colors duration-200"
          >
            Open source
          </a>
        </p>
      </footer>
    </div>
  );
}
