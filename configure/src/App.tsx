import { useState } from "react";
import "./App.css";

const Providers = {
  TorrentProject: "TorrentProject",
  ThePirateBay: "The Pirate Bay",
  LimeTorrents: "LimeTorrents",
} as const;

type Provider = keyof typeof Providers;

const Sorting = {
  Seeders: "Seeders",
  Quality: "Quality",
  QualityThenSeeders: "Quality Then Seeders",
  SeedersThenQuality: "Seeders Then Quality",
} as const;

type SortingStrategy = keyof typeof Sorting;

interface Options {
  providers: Set<Provider>;
  sorting: SortingStrategy;
}

type UpdatedOption =
  | { name: "providers"; value: Set<Provider> }
  | { name: "sorting"; value: SortingStrategy };

interface ProvidersOptionProps {
  providers: Set<Provider>;
  onClick: (changed: UpdatedOption) => void;
}

interface SortingOptionProps {
  sorting: SortingStrategy;
  onChange: (changed: UpdatedOption) => void;
}

interface InstallationProps {
  link: string;
}

const providerNames = Object.keys(Providers) as Provider[];

function buildLinkFromOptions(options: Options): string {
  const selected = {
    providers: [...options.providers],
    sorting: options.sorting,
  };
  const encoded = encodeURIComponent(JSON.stringify(selected));

  return `stremio:${window.location.host}/${encoded}/manifest.json`;
}

function Navbar() {
  return (
    <div className="navbar fixed bg-base-100 shadow-sm min-h-10 px-2 py-1">
      <div className="flex-none hover:animate-rotate-360 hover:animate-duration-400 hover:animate-delay-200">
        <img
          src="https://dl.strem.io/addon-logo.png"
          alt="Logo"
          className="h-6 w-6 object-contain"
        />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold p-2">
          Sailor, a torrents bay navigator
        </p>
      </div>
      <div className="flex-none hover:animate-pulsing">
        <label className="swap swap-rotate rounded-full hover:outline-2 hover:outline-offset-2">
          <input type="checkbox" className="theme-controller" value="retro" />
          <svg
            className="swap-on h-6 w-6 fill-current"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
          >
            <path d="M5.64,17l-.71.71a1,1,0,0,0,0,1.41,1,1,0,0,0,1.41,0l.71-.71A1,1,0,0,0,5.64,17ZM5,12a1,1,0,0,0-1-1H3a1,1,0,0,0,0,2H4A1,1,0,0,0,5,12Zm7-7a1,1,0,0,0,1-1V3a1,1,0,0,0-2,0V4A1,1,0,0,0,12,5ZM5.64,7.05a1,1,0,0,0,.7.29,1,1,0,0,0,.71-.29,1,1,0,0,0,0-1.41l-.71-.71A1,1,0,0,0,4.93,6.34Zm12,.29a1,1,0,0,0,.7-.29l.71-.71a1,1,0,1,0-1.41-1.41L17,5.64a1,1,0,0,0,0,1.41A1,1,0,0,0,17.66,7.34ZM21,11H20a1,1,0,0,0,0,2h1a1,1,0,0,0,0-2Zm-9,8a1,1,0,0,0-1,1v1a1,1,0,0,0,2,0V20A1,1,0,0,0,12,19ZM18.36,17A1,1,0,0,0,17,18.36l.71.71a1,1,0,0,0,1.41,0,1,1,0,0,0,0-1.41ZM12,6.5A5.5,5.5,0,1,0,17.5,12,5.51,5.51,0,0,0,12,6.5Zm0,9A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z" />
          </svg>
          <svg
            className="swap-off h-6 w-6 fill-current"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
          >
            <path d="M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49a8.59,8.59,0,0,1,.25-2A1,1,0,0,0,8,2.36,10.14,10.14,0,1,0,22,14.05,1,1,0,0,0,21.64,13Zm-9.5,6.69A8.14,8.14,0,0,1,7.08,5.22v.27A10.15,10.15,0,0,0,17.22,15.63a9.79,9.79,0,0,0,2.1-.22A8.11,8.11,0,0,1,12.14,19.73Z" />
          </svg>
        </label>
      </div>
    </div>
  );
}

function ProvidersOption({ providers, onClick }: ProvidersOptionProps) {
  return (
    <div className="flex justify-center">
      <div className="grid grid-rows-1 gap-6">
        <div className="place-self-center">
          <div className="flex gap-1">
            <p className="text-2xl font-bold pl-5">Torrent Providers</p>
            <div className="size-5 tooltip tooltip-end lg:tooltip-center tooltip-top lg:tooltip-right tooltip-primary tooltip-no-arrow">
              <div className="tooltip-content border border-2 font-normal translate-x-6 lg:translate-x-0">
                At least one must be selected. If you deselect all, they will be
                selected again automatically
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="hover:animate-scale hover:animate-duration-100"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z"
                />
              </svg>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Object.entries(Providers).map(([name, representation]) => {
            return (
              <button
                key={name}
                className={
                  "btn btn-primary btn-sm rounded-full hover:outline-2 hover:outline-offset-2" +
                  (providers.has(name as Provider)
                    ? ""
                    : " text-primary bg-transparent")
                }
                onClick={() => {
                  const provider = name as Provider;
                  if (providers.has(provider)) providers.delete(provider);
                  else providers.add(provider);

                  if (providers.size === 0)
                    providerNames.forEach((provider) =>
                      providers.add(provider),
                    );

                  onClick({ name: "providers", value: providers });
                }}
              >
                {representation}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SortingOption({ sorting, onChange }: SortingOptionProps) {
  return (
    <div className="flex justify-center">
      <div className="grid grid-rows-1 gap-6">
        <div className="place-self-center">
          <div className="flex gap-1">
            <p className="text-2xl font-bold pl-5">Sorting Strategy</p>
            <div className="size-5 tooltip tooltip-end lg:tooltip-center tooltip-top lg:tooltip-right tooltip-primary tooltip-no-arrow">
              <div className="tooltip-content border border-2 font-normal translate-x-6 lg:translate-x-0">
                Listed streams will be sorted according to the selected criteria
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="hover:animate-scale hover:animate-duration-100"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z"
                />
              </svg>
            </div>
          </div>
        </div>
        <select
          className="select w-auto font-semibold hover:outline-2 hover:outline-offset-2"
          defaultValue={sorting}
          onChange={(event) =>
            onChange({
              name: "sorting",
              value: event.target.value as SortingStrategy,
            })
          }
        >
          {Object.entries(Sorting).map(([name, representation]) => {
            return (
              <option key={name} value={name}>
                {representation}
              </option>
            );
          })}
        </select>
      </div>
    </div>
  );
}

function Installation({ link }: InstallationProps) {
  return (
    <div className="flex justify-center">
      <a href={link}>
        <button className="btn btn-primary btn-sm hover:animate-tada hover:outline-2 hover:outline-offset-2">
          Install
        </button>
      </a>
    </div>
  );
}

function Configuration() {
  const [options, setOptions] = useState({
    providers: new Set(providerNames),
    sorting: "QualityThenSeeders",
  } as Options);

  const [link, setLink] = useState(buildLinkFromOptions(options));

  const handleOption = (updated: UpdatedOption) => {
    const newOptions = { ...options, [updated.name]: updated.value };
    setOptions(newOptions);

    const newLink = buildLinkFromOptions(newOptions);
    setLink(newLink);
  };

  return (
    <div className="h-screen flex items-center justify-center">
      <div className="grid grid-rows-1 gap-18">
        <p className="text-center text-4xl font-bold underline decoration-4">
          Addon Configuration
        </p>
        <div>
          <ProvidersOption
            providers={options.providers}
            onClick={handleOption}
          />
          <div className="divider"></div>
          <SortingOption sorting={options.sorting} onChange={handleOption} />
          <div className="divider"></div>
          <Installation link={link} />
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <>
      <Navbar />
      <Configuration />
    </>
  );
}

export default App;
