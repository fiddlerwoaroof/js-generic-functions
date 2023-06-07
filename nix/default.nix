{ sources ? import ./sources.nix, pkgs ? import sources.nixpkgs {
  overlays = [ ];
  config = { };
}, stdenv ? pkgs.stdenv, fetchurl ? pkgs.lib.fetchurl }:

let
  nodejs = pkgs.nodejs-16_x;
  yarn = pkgs.yarn.overrideAttrs (_: { buildInputs = [ nodejs ]; });
  hp = pkgs.haskellPackages.override {
    overrides = self: super:
      let
        workaround140774 = hpkg:
          with pkgs.haskell.lib;
          overrideCabal hpkg (drv: { enableSeparateBinOutput = false; });
      in { niv = workaround140774 super.niv; };
  };

in {
  shell = stdenv.mkDerivation {
    name = "shell-env";
    buildInputs = [nodejs hp.niv];
  };
  niv = hp.niv;
}

