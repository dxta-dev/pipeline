{
  description = "DXTA pipeline dev environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.11";
    nix2container.url = "github:nlewo/nix2container";
  };

  outputs =
    {
      self,
      nixpkgs,
      nix2container,
    }:
    let
      systems = [
        "aarch64-darwin"
        "aarch64-linux"
        "x86_64-darwin"
        "x86_64-linux"
      ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
      devShells = forAllSystems (
        system:
        let
          pkgs = import nixpkgs { inherit system; };
        in
        {
          default = pkgs.mkShell {
            packages =
              (with pkgs; [
                nodejs_24
                biome
                pnpm
                git
                jq
                temporal
                temporal-cli
                python3
                pkg-config
                cairo
                openssl
                zlib
                libpng
                giflib
                libjpeg_turbo
              ])
              ++ pkgs.lib.optionals pkgs.stdenv.isLinux [
                pkgs.libuuid
                pkgs.skopeo
              ];
          };
        }
      );

      packages = forAllSystems (
        system:
        let
          pkgs = import nixpkgs { inherit system; };
          nodejs = pkgs.nodejs_24;
          pnpmDeps = pkgs.fetchPnpmDeps {
            pname = "dxta-pipeline";
            version = "1.0.0";
            src = self;
            fetcherVersion = 3;
            hash = "sha256-pnHjpABoHSO0RqBQVABw5qr30D7LfVHUY6VbpvgMHlY=";
          };

          mkAppBundle =
            { pname, workspace }:
            pkgs.stdenvNoCC.mkDerivation {
              inherit pname pnpmDeps;
              version = "1.0.0";
              src = self;

              nativeBuildInputs = [
                nodejs
                pkgs.pnpm
                pkgs.pnpmConfigHook
              ];

              buildPhase = ''
                pnpm run build
              '';

              installPhase = ''
                mkdir -p $out/app
                cp -R node_modules apps packages package.json pnpm-workspace.yaml $out/app/
              '';
            };

          mkImage =
            {
              name,
              bundle,
              cmd,
              exposedPorts ? { },
            }:
            nix2container.packages.${system}.nix2container.buildImage {
              inherit name;
              tag = "latest";

              copyToRoot = pkgs.buildEnv {
                name = "rootfs";
                paths = [
                  nodejs
                  bundle
                ];
                pathsToLink = [ "/" ];
              };

              config = {
                WorkingDir = "/app";
                Cmd = cmd;
                Env = [ "NODE_ENV=production" ];
                ExposedPorts = exposedPorts;
              };
            };

          orchestratorBundle = mkAppBundle {
            pname = "dxta-orchestrator";
            workspace = "@dxta/orchestrator";
          };

          workerExtractBundle = mkAppBundle {
            pname = "dxta-worker-extract";
            workspace = "@dxta/worker-extract";
          };

          workerTransformBundle = mkAppBundle {
            pname = "dxta-worker-transform";
            workspace = "@dxta/worker-transform";
          };
        in
        {
          orchestrator-bundle = orchestratorBundle;
          worker-extract-bundle = workerExtractBundle;
          worker-transform-bundle = workerTransformBundle;

          image-orchestrator = mkImage {
            name = "ghcr.io/dxta-dev/dxta-orchestrator";
            bundle = orchestratorBundle;
            cmd = [
              "node"
              "apps/orchestrator/dist/index.js"
            ];
            exposedPorts = {
              "3000/tcp" = { };
            };
          };

          image-worker-extract = mkImage {
            name = "ghcr.io/dxta-dev/dxta-worker-extract";
            bundle = workerExtractBundle;
            cmd = [
              "node"
              "apps/worker-extract/dist/index.js"
            ];
          };

          image-worker-transform = mkImage {
            name = "ghcr.io/dxta-dev/dxta-worker-transform";
            bundle = workerTransformBundle;
            cmd = [
              "node"
              "apps/worker-transform/dist/index.js"
            ];
          };
        }
      );
    };
}
