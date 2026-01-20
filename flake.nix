{
  description = "DXTA pipeline dev environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.11";
  };

  outputs = { self, nixpkgs }:
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
      devShells = forAllSystems (system:
        let
          pkgs = import nixpkgs { inherit system; };
        in
        {
          default = pkgs.mkShell {
            packages =
              (with pkgs; [
                nodejs_24
                pnpm
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
              ];
          };
        });
    };
}
